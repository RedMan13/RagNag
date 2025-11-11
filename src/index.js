const { Assets } = require("./assets.js");
const TileSpace = require('./tile-drawing.js');
const TextLayer = require('./text-layer.js');
const Physics = require('./physics.js');
const { DebuggerTiles } = require('./debuggers.js');
const WebGLRenderer = require('./renderer/src/index.js');
const path = require('node:path');
const { hsvToRgb } = require('./renderer/src/util/color-conversions.js');
const Point = require('./point.js');
const { keys, handleKeys, names } = require('./key-actions.js');
const fs = require('fs');
const Settings = require('./settings.js');

// find a somewhere to expect our none-code files to exist in
const hostDir = process.env.HOST || path.resolve('.');

class MainGame {
    static layers = {
        tiles: TileSpace.drawableLayer, 
        cursor: 'cursor', 
        entities: 'entities', 
        debuggers: 'debuggers',
        settings: 'settings',
        tooltip: 'tooltip',
        text: TextLayer.layer
    };

    assets = new Assets(path.resolve(hostDir, 'assets'));
    stats = {
        drawTime: {
            start: Date.now(),
            time: 1,
            times: [],
            changed: false
        },
        tickTime: {
            start: Date.now(),
            time: 1,
            times: [],
            changed: false
        },
        maxTimes: 100,
        idealFps: 60
    };
    /** @type {import('glfw-raub').Window} */
    window = null;
    /** @type {import('webgl-raub')} */
    canvas = null;
    /** @type {WebGLRenderer} */
    render = null;
    /** @type {TileSpace} */
    tiles = null;
    /** @type {TextLayer} */
    text = null;
    /** @type {DebuggerTiles} */
    debugTiles = null;
    /** @type {Physics} */
    entities = null;
    /** @type {number} */
    player = null;
    cursor = {
        tile: TileSpace.tiles.error,
        pos: new Point(0,0),
        /** @type {number} */
        draw: null
    }
    movingPlayer = false;
    camOff = new Point(0,0);
    /** @type {Settings} */
    settings = null;
    stepping = false;

    constructor(window, canvas) {
        this.window = window;
        this.canvas = canvas;
        this._initKeys();
    }
    _initRenderer() {
        this.render = new WebGLRenderer(this.canvas, -this.window.width / 2, this.window.width / 2, this.window.height / 2, -this.window.height / 2);
        this.render.renderOffscreen = true;
        this.render.setBackgroundColor(0,0,0,0);
        this.render.setLayerGroupOrdering(Object.values(MainGame.layers));

        this.window.on('resize', () => {
            this.render.setStageSize(
                -this.window.width / 2,
                this.window.width / 2,
                -this.window.height / 2,
                this.window.height / 2
            );
            if (!this.debugTiles) return;
            this.debugTiles.width = this.window.width;
            this.debugTiles.height = this.window.height;
            this.tiles.resizeViewport(this.window.width, this.window.height);
            this.text.resizeViewport(this.window.width, this.window.height);
        });
    }
    _initDebugTiles() {
        this.debugTiles = new DebuggerTiles(1, this.window.width, this.window.height, MainGame.layers.debuggers, this.render, window, this.stats);
        this.debugTiles.direction = 'right';
        this.debugTiles.resetPositions();
        this.debugTiles.createTile(function(ctx, { drawTime: { time, times, changed }, maxTimes, idealFps }) {
            if (!changed) return true;
            this.data.changed = false;
            ctx.antialias = 'default';
            ctx.textBaseline = 'alphabetic';
            let y = 0;
            ctx.resetTransform();
            ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
            ctx.scale(1,-1);
            ctx.translate(0, -this.canvas.height);
            ctx.scale(this.subSampling, this.subSampling);
            const avg = times.reduce((c,v) => c + v, 0) / times.length;
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.font = '20px';
            const dtTxt = `DT: ${time} (${avg})`;
            ctx.strokeText(dtTxt, 0,y += 17);
            ctx.fillText(dtTxt, 0,y);
            const fpsTxt = `FPS: ${(1 / time).toFixed(2)} (${Math.round(1 / avg)})`;
            ctx.strokeText(fpsTxt, 0,y += 17);
            ctx.fillText(fpsTxt, 0,y);
            const countTxt = `Count: ${this.render._allDrawables.length} (${this.render._allSkins.length})`;
            ctx.strokeText(countTxt, 0,y += 17);
            ctx.fillText(countTxt, 0,y);
            ctx.fillStyle = '#222';
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;

            ctx.antialias = 'none';
            y += 5
            const height = 128;
            const width = 256;
            ctx.fillRect(0, y, width, height);
            ctx.strokeRect(0, y, width, height);
            const max = times.reduce((c,v) => Math.max(c,1 / v), 0);
            for (let i = 0, plot = times[i]; i < times.length; plot = times[++i]) {
                const fps = 1 / plot;
                const len = (fps / max) * height;
                const rgb = hsvToRgb([(Math.min(fps / idealFps, 1) * 128) / 360, .5, 1], []);
                ctx.fillStyle = `rgb(${rgb})`;
                ctx.fillRect((i / maxTimes) * width, (height - len) + y, width / maxTimes, len);
            }
            ctx.antialias = 'default';
            ctx.fillStyle = 'blue';
            ctx.fillRect(0, (height - (((1 / avg) / max) * height)) + y, width, 1.5);
            ctx.fillStyle = 'cyan';
            const targetY = (height - ((idealFps / max) * height)) + y;
            if (targetY > y) ctx.fillRect(0, targetY, width, 1.5);
            y += height;

            let x = 5;
            y += 5;
            ctx.strokeStyle = 'rgba(0,0,0, 30%)';
            ctx.fillStyle = `rgb(${hsvToRgb([128 / 360, .5, 1], [])})`;
            ctx.lineWidth = 4;
            ctx.fillRect(x, y, 30, 15);
            ctx.strokeRect(x, y, 30, 15);
            x += 30;
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.font = '15px';
            const bestTxt = ' - Best';
            ctx.strokeText(bestTxt, x,y);
            ctx.fillText(bestTxt, x,y);
            x += ctx.measureText(bestTxt).width;
            x += 5;

            ctx.strokeStyle = 'rgba(0,0,0, 30%)';
            ctx.fillStyle = `rgb(${hsvToRgb([0, .5, 1], [])})`;
            ctx.lineWidth = 4;
            ctx.fillRect(x, y, 30, 15);
            ctx.strokeRect(x, y, 30, 15);
            x += 30;
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.font = '15px';
            const worstTxt = ' - Worst';
            ctx.strokeText(worstTxt, x,y);
            ctx.fillText(worstTxt, x,y);
            x += ctx.measureText(worstTxt).width;
            x = 5;
            y += 20;

            ctx.strokeStyle = 'rgba(0,0,0, 30%)';
            ctx.fillStyle = `blue`;
            ctx.lineWidth = 4;
            ctx.fillRect(x, y, 30, 15);
            ctx.strokeRect(x, y, 30, 15);
            x += 30;
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.font = '15px';
            const avgTxt = ' - Avg';
            ctx.strokeText(avgTxt, x,y);
            ctx.fillText(avgTxt, x,y);
            x += ctx.measureText(avgTxt).width;
            x += 5;

            ctx.strokeStyle = 'rgba(0,0,0, 30%)';
            ctx.fillStyle = `cyan`;
            ctx.lineWidth = 4;
            ctx.fillRect(x, y, 30, 15);
            ctx.strokeRect(x, y, 30, 15);
            x += 30;
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.font = '15px';
            const idealTxt = ' - Ideal';
            ctx.strokeText(idealTxt, x,y);
            ctx.fillText(idealTxt, x,y);
            x += ctx.measureText(idealTxt).width;
            x += 5;
        }, 256, 256, 'Speed statistics for frame drawing');
        this.debugTiles.createTile(function(ctx, { tickTime: { time, times, changed }, maxTimes, idealFps }) {
            return true;
            if (!changed) return true;
            this.data.changed = false;
            ctx.antialias = 'default';
            ctx.textBaseline = 'alphabetic';
            let y = 0;
            ctx.resetTransform();
            ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
            ctx.scale(this.subSampling, this.subSampling);
            const avg = times.reduce((c,v) => c + v, 0) / times.length;
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.font = '20px';
            const dtTxt = `DT: ${time} (${avg})`;
            ctx.strokeText(dtTxt, 0,y += 17);
            ctx.fillText(dtTxt, 0,y);
            const fpsTxt = `FPS: ${(1 / time).toFixed(2)} (${Math.round(1 / avg)})`;
            ctx.strokeText(fpsTxt, 0,y += 17);
            ctx.fillText(fpsTxt, 0,y);
            const countTxt = `Count: ${this.render._allDrawables.length} (${this.render._allSkins.length})`;
            ctx.strokeText(countTxt, 0,y += 17);
            ctx.fillText(countTxt, 0,y);
            ctx.fillStyle = '#222';
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;

            ctx.antialias = 'none';
            y += 5
            const height = 128;
            const width = 256;
            ctx.fillRect(0, y, width, height);
            ctx.strokeRect(0, y, width, height);
            const max = times.reduce((c,v) => Math.max(c,1 / v), 0);
            for (let i = 0, plot = times[i]; i < times.length; plot = times[++i]) {
                const fps = 1 / plot;
                const len = (fps / max) * height;
                const rgb = hsvToRgb([(Math.min(fps / idealFps, 1) * 128) / 360, .5, 1], []);
                ctx.fillStyle = `rgb(${rgb})`;
                ctx.fillRect((i / maxTimes) * width, (height - len) + y, width / maxTimes, len);
            }
            ctx.antialias = 'default';
            ctx.fillStyle = 'blue';
            ctx.fillRect(0, (height - (((1 / avg) / max) * height)) + y, width, 1.5);
            ctx.fillStyle = 'cyan';
            const targetY = (height - ((idealFps / max) * height)) + y;
            if (targetY > y) ctx.fillRect(0, targetY, width, 1.5);
            y += height;

            let x = 5;
            y += 5;
            ctx.strokeStyle = 'rgba(0,0,0, 30%)';
            ctx.fillStyle = `rgb(${hsvToRgb([128 / 360, .5, 1], [])})`;
            ctx.lineWidth = 4;
            ctx.fillRect(x, y, 30, 15);
            ctx.strokeRect(x, y, 30, 15);
            x += 30;
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.font = '15px';
            const bestTxt = ' - Best';
            ctx.strokeText(bestTxt, x,y);
            ctx.fillText(bestTxt, x,y);
            x += ctx.measureText(bestTxt).width;
            x += 5;

            ctx.strokeStyle = 'rgba(0,0,0, 30%)';
            ctx.fillStyle = `rgb(${hsvToRgb([0, .5, 1], [])})`;
            ctx.lineWidth = 4;
            ctx.fillRect(x, y, 30, 15);
            ctx.strokeRect(x, y, 30, 15);
            x += 30;
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.font = '15px';
            const worstTxt = ' - Worst';
            ctx.strokeText(worstTxt, x,y);
            ctx.fillText(worstTxt, x,y);
            x += ctx.measureText(worstTxt).width;
            x = 5;
            y += 20;

            ctx.strokeStyle = 'rgba(0,0,0, 30%)';
            ctx.fillStyle = `blue`;
            ctx.lineWidth = 4;
            ctx.fillRect(x, y, 30, 15);
            ctx.strokeRect(x, y, 30, 15);
            x += 30;
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.font = '15px';
            const avgTxt = ' - Avg';
            ctx.strokeText(avgTxt, x,y);
            ctx.fillText(avgTxt, x,y);
            x += ctx.measureText(avgTxt).width;
            x += 5;

            ctx.strokeStyle = 'rgba(0,0,0, 30%)';
            ctx.fillStyle = `cyan`;
            ctx.lineWidth = 4;
            ctx.fillRect(x, y, 30, 15);
            ctx.strokeRect(x, y, 30, 15);
            x += 30;
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.font = '15px';
            const idealTxt = ' - Ideal';
            ctx.strokeText(idealTxt, x,y);
            ctx.fillText(idealTxt, x,y);
            x += ctx.measureText(idealTxt).width;
            x += 5;
        }, 256, 256, 'Speed statistics for the physics engine');
        const game = this;
        this.debugTiles.createTile(function(ctx) {
            ctx.antialias = 'default';
            ctx.textBaseline = 'alphabetic';
            let y = 0;
            ctx.resetTransform();
            ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
            ctx.scale(1,-1);
            ctx.translate(0, -this.canvas.height);
            ctx.scale(this.subSampling, this.subSampling);
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.font = '20px';
            const posText = `XY: [${game.tiles.camera.pos.map(num => num.toFixed(0)).join(', ')}]`;
            ctx.strokeText(posText, 0,y += 17);
            ctx.fillText(posText, 0,y);
            const tilePosText = `tXtY: [${game.tiles.camera.pos.clone().div(game.tiles.tileWh).map(num => num.toFixed(0)).join(', ')}]`;
            ctx.strokeText(tilePosText, 0,y += 17);
            ctx.fillText(tilePosText, 0,y);
            const cursorText = `cursor: ${game.cursor.tile} [${game.cursor.pos.map(num => num.toFixed(0)).join(', ')}]`;
            ctx.strokeText(cursorText, 0,y += 17);
            ctx.fillText(cursorText, 0,y);
            const playerPosText = `player XY: ${game.entities.entities[0]?.pos}`;
            ctx.strokeText(playerPosText, 0,y += 17);
            ctx.fillText(playerPosText, 0,y);
            const playerVelText = `player vel: ${game.entities.entities[0]?.vel}`;
            ctx.strokeText(playerVelText, 0,y += 17);
            ctx.fillText(playerVelText, 0,y);
            const tilesText = `Tiles: ${game.tiles.wh[0] * game.tiles.wh[1]} [${game.tiles.wh.join(', ')}]`;
            ctx.strokeText(tilesText, 0,y += 17);
            ctx.fillText(tilesText, 0,y);
        }, 256, 128, 'Info on the tile render');
    }
    _initTileSpace() {
        this.cursor.draw = this.render.createDrawable(MainGame.layers.cursor);
        this.render.updateDrawableVisible(this.cursor.draw, false);
        this.tiles = new TileSpace(this.window, this.render, 20,20, 600,200, true);
        this.tiles.loadAssets(this.assets);
        this.text = new TextLayer(this.window, this.render, 6,6, 200, 200, true);
        this.text.loadAssets(this.assets);
        console.text = this.text;
        this.entities = new Physics(this.tiles, this.render);
        this.entities.loadAssets(this.assets);
        this.player = this.entities.createEntity(this.tiles.tileWh[0] * 2,this.tiles.tileWh[1] * 3, 'player');
        console.log('Loading save file...');
        fs.readFile('./save.json', 'utf8', (err, data) => {
            if (err) return console.log('No save file present!');
            if (data.length < 2) return console.log('Invalid save file, aborting load.');
            this.tiles.map = JSON.parse(data);
            console.log('Save loaded!');
        });
    }
    _initKeys() {
        keys['Open Settings']         = [[names.Escape],    true,  () => this.settings = new Settings(this.text, window), 'Opens the settings and exit menu'];
        keys['Camera Left']           = [[names.A],         false, () => this.camOff[0] -= 200 * this.stats.drawTime.time, 'Moves the debug/painting camera left'];
        keys['Camera Right']          = [[names.D],         false, () => this.camOff[0] += 200 * this.stats.drawTime.time, 'Moves the debug/painting camera right'];
        keys['Camera Up']             = [[names.W],         false, () => this.camOff[1] += 200 * this.stats.drawTime.time, 'Moves the debug/painting camera up'];
        keys['Camera Down']           = [[names.S],         false, () => this.camOff[1] -= 200 * this.stats.drawTime.time, 'Moves the debug/painting camera down'];
        keys['Player Go To']          = [[names.E],         false, () => {
            this.movingPlayer = true;
            this.entities.moveEntity(this.player, this.tiles.screenWh[0] - (this.cursor.pos[0] * this.tiles.tileWh[0]), (this.cursor.pos[1] * this.tiles.tileWh[1]));
            this.entities.entities[this.player].vel = new Point(0,0);
        }]
        keys['Clear Camera Position'] = [[names.Q],         false, () => this.camOff.set(0,0), 'Resets the offset curently given to the camera'];
        keys['Jump']                  = [[names.M],         false, () => {
            if (!this.entities.entities[this.player]?.gravity)
                return this.entities.nudgeEntity(this.player, 0,20);
            if (!this.entities.entities[this.player]?.collided) return;
            switch (this.entities.entities[this.player]?.collided) {
            case 'left':
                this.entities.nudgeEntity(this.player, 15,7.5); break;
            case 'right':
                this.entities.nudgeEntity(this.player, -15,7.5); break;
            case 'down':
                this.entities.nudgeEntity(this.player, 0,15); break;
            }
        }, 'Makes the player jump'];
        keys['Crouch']                = [[names.Period],    false, () => {
            if (!this.entities.entities[this.player].gravity)
                return this.entities.nudgeEntity(this.player, 0,-20);
            this.entities.nudgeEntity(this.player, 0,-1);
        }, 'Makes the player crouch down'];
        keys['Move Left']             = [[names.N],         false, () => {
            this.entities.nudgeEntity(this.player, 5,0);
            if (this.entities.entities[this.player]?.collided === 'down')
                this.entities.nudgeEntity(this.player, 15,0);
        }, 'Makes the player move left'];
        keys['Move Right']            = [[names.Comma],     false, () => {
            this.entities.nudgeEntity(this.player, -5,0);
            if (this.entities.entities[this.player]?.collided === 'down')
                this.entities.nudgeEntity(this.player, -15,0);
        }, 'Makes the player move right'];
        keys['Place Tile']            = [[names.MouseLeft], false, () => {
            if (!this.tiles.map[this.cursor.pos[0]]?.[this.cursor.pos[1]]) return;
            this.tiles.map[this.cursor.pos[0]][this.cursor.pos[1]] = { type: this.cursor.tile };
        }, 'Sets the type of the currently hovered tile to the selected type'];
        keys['Clear Tile']            = [[names.MouseRight], false, () => {
            if (!this.tiles.map[this.cursor.pos[0]]?.[this.cursor.pos[1]]) return;
            this.tiles.map[this.cursor.pos[0]][this.cursor.pos[1]] = { type: 0 };
        }, 'Sets the type of the currently hovered tile to empty'];
        this.window.on('wheel', ({ deltaX }) => {
            if (deltaX === 0) return;
            this.cursor.tile += Math.sign(deltaX) / 2;
            this.cursor.tile = Math.max(this.cursor.tile, 1);
        })
        keys['Save Map']              = [[names.ControlLeft, names.S], true, () => {
            console.log('Saving game...');
            fs.writeFile('./save.json', JSON.stringify(this.tiles.map), err => { if (err) throw err; console.log('Saved!'); })
        }, 'Saves the current map data into save.json'];
        keys['Step Physics']          = [[names.Z],         true, () => {
            this.stepping = true;
            this.drawPhysics();
        }, 'When pressed, makes the physics only be ticked when the key is pressed'];
        keys['Open Console']          = [[names.Backquote], true, () => console.visible ? console.hide() : console.show(), 'Showa/hides the console.'];
    }
    async loadAssets() {
        await Promise.all([
            this.assets.registerAsset('sprite-vert', 'shaders/sprite.vert.glsl'),
            this.assets.registerAsset('sprite-frag', 'shaders/sprite.frag.glsl'),
            
            this.assets.registerAsset('error', 'error.svg'),
            this.assets.registerAsset('top-left', 'tiles/top-left.svg'),
            this.assets.registerAsset('top', 'tiles/top.svg'),
            this.assets.registerAsset('top-right', 'tiles/top-right.svg'),
            this.assets.registerAsset('right', 'tiles/right.svg'),
            this.assets.registerAsset('bottom-right', 'tiles/bottom-right.svg'),
            this.assets.registerAsset('bottom', 'tiles/bottom.svg'),
            this.assets.registerAsset('bottom-left', 'tiles/bottom-left.svg'),
            this.assets.registerAsset('left', 'tiles/left.svg'),
            
            ...(new Array(256).fill(0)
                .map((_,i) => this.assets.registerAsset(`char-${i}`, `tiles/text/tile${i.toString().padStart(3, '0')}.png`))),

            this.assets.registerAsset('pang', 'entities/penguin.svg')
        ]);
    }
    start() {
        // for (let i = 0; i < 200; i++)
        //     this.entities.createEntity(140,20, 'error');
        setInterval(() => {
            if (this.stepping) return;
            this.drawPhysics();
        }, 1000/60);
        this.window.loop(this.drawFrame.bind(this));
    }
    drawPhysics() {
        if (!this.settings)
            this.entities.tick();
        this.stats.tickTime.time = (Date.now() - this.stats.tickTime.start) / 1000;
        this.stats.tickTime.times.push(this.stats.tickTime.time);
        if (this.stats.tickTime.times.length > this.stats.maxTimes)
            this.stats.tickTime.times.shift();
        this.stats.tickTime.start = Date.now();
        this.stats.tickTime.changed = true;
    }
    drawDebugInfo() {
        if (console.visible) return;
        const avgDraw = this.stats.drawTime.times.reduce((c,v) => c + v, 0) / this.stats.drawTime.times.length;

        this.text.text(`\x1b[move 0;0 \x1b[foreColor #FFFFFF \x1b[backColor #00000000 DT: ${this.stats.drawTime.time} (${avgDraw})
FPS: ${Math.round(1 / this.stats.drawTime.time)} (${Math.round(1 / avgDraw)})
Draw Count: ${this.render._drawList.length} (${this.render._allSkins.length})`);
        this.text.strokeWidth = 0;
        this.text.cursor[0] = 0;
        const height = 10;
        const width = 32;
        this.text.clearArea(this.text.cursor[0], this.text.cursor[1], width, height);
        this.text.strokeWidth = (width / this.stats.maxTimes) * 6;
        const capOff = (this.text.strokeWidth / 2) / TextLayer.tileSize[1];
        const max = this.stats.drawTime.times.reduce((c,v) => Math.max(c,1 / v), 0);
        for (let i = 0, plot = this.stats.drawTime.times[i]; i < this.stats.drawTime.times.length; plot = this.stats.drawTime.times[++i]) {
            const fps = 1 / plot;
            const len = ((fps / max) * (height -1)) - capOff;
            const rgb = hsvToRgb([(Math.min(fps / this.stats.idealFps, 1) * 128) / 360, .5, 1], []);
            this.text.stroke = `rgb(${rgb})`;
            this.text.line(Math.floor(((i / this.stats.maxTimes) * width) * 6) / 6, height + this.text.cursor[1] - capOff, Math.floor(((i / this.stats.maxTimes) * width) * 6) / 6, (height + this.text.cursor[1]) - len);
        }
        this.text.strokeWidth = 0;
        this.text.fill = '#0000FF';
        this.text.rect(0, (height - (((1 / avgDraw) / max) * height)) + this.text.cursor[1], width, 0.25);
        this.text.fill = '#00FFFF';
        const targetY = (height - ((this.stats.idealFps / max) * height)) + this.text.cursor[1];
        if (targetY > this.text.cursor[1]) this.text.rect(0, targetY, width, 0.25);
        this.text.cursor[1] += height +1;
        this.text.cursor[0] = 0;
        this.text.fill = '#00000000';
        this.text.stroke = '#000000';

        const avgTick = this.stats.tickTime.times.reduce((c,v) => c + v, 0) / this.stats.tickTime.times.length;

        this.text.text(`\x1b[foreColor #FFFFFF \x1b[backColor #00000000 DT: ${this.stats.tickTime.time} (${avgTick})
TPS: ${Math.round(1 / this.stats.tickTime.time)} (${Math.round(1 / avgTick)})
Tick Count: ${this.entities.entities.length}`);
        this.text.strokeWidth = 0;
        this.text.strokeWidth = (width / this.stats.maxTimes) * 6;
        this.text.cursor[0] = 0;
        this.text.clearArea(this.text.cursor[0], this.text.cursor[1], width, height);
        const maxTick = this.stats.tickTime.times.reduce((c,v) => Math.max(c,1 / v), 0);
        for (let i = 0, plot = this.stats.tickTime.times[i]; i < this.stats.tickTime.times.length; plot = this.stats.tickTime.times[++i]) {
            const fps = 1 / plot;
            const len = ((fps / maxTick) * (height -1)) - capOff;
            const rgb = hsvToRgb([(Math.min(fps / this.stats.idealFps, 1) * 128) / 360, .5, 1], []);
            this.text.stroke = `rgb(${rgb})`;
            this.text.line(Math.floor(((i / this.stats.maxTimes) * width) * 6) / 6, height + this.text.cursor[1] - capOff, Math.floor(((i / this.stats.maxTimes) * width) * 6) / 6, (height + this.text.cursor[1]) - len);
        }
        this.text.strokeWidth = 0;
        this.text.fill = '#0000FF';
        this.text.rect(0, (height - (((1 / avgTick) / maxTick) * height)) + this.text.cursor[1], width, 0.25);
        this.text.fill = '#00FFFF';
        const targetTickY = (height - ((this.stats.idealFps / maxTick) * height)) + this.text.cursor[1];
        if (targetTickY > this.text.cursor[1]) this.text.rect(0, targetTickY, width, 0.25);
        this.text.cursor[1] += height;
        this.text.cursor[0] = 0;
        this.text.fill = '#00000000';
        this.text.stroke = '#000000';
        this.text.text(`
\x1b[backColor #80ff91 Good FPS\x1b[reset \t\x1b[backColor #ff8080 Bad FPS\x1b[reset 
\x1b[backColor #0000FF Average FPS\x1b[reset \t\x1b[backColor #00FFFF Ideal FPS\x1b[reset 
        `);
    }
    drawFrame() {
        this.drawDebugInfo();
        if (this.stepping && !this.tiles.debug.enabled) {
            this.tiles.enableDebug();
            this.entities.enableDebug();
        }
        
        this.movingPlayer = false;
        this.tiles.draw();
        this.entities.draw();
        if (this.settings)
            this.settings.draw();

        const target = this.entities.entities[this.player].pos.clone();
        this.render.setBackgroundColor(Math.min(((500 - (target[1] / this.tiles.tileWh[1])) / 500) * 0.384313725, 0.384313725), Math.min(((500 - (target[1] / this.tiles.tileWh[1])) / 500) * 0.670588235, 0.670588235), ((500 - (target[1] / this.tiles.tileWh[1])) / 500) * 0.858823529, 1);
        const distance = target.clone().scale(-1,1).sub(this.tiles.camera.pos);
        if (!this.movingPlayer) {
            this.tiles.camera.pos = this.camOff.clone()
                .sub(this.tiles.screenWh.clone().div(2))
                .add(this.tiles.camera.pos)
                .add(distance.mul(0.20));
        }

        const screenPos = this.tiles.screenToWorld(this.window.cursorPos.x, this.window.cursorPos.y);
        this.cursor.pos = screenPos.clone()
            .sub(this.tiles.screenWh.clone().div(2))
            .add(this.tiles.camera.pos.clone().div(this.tiles.tileWh))
            .clamp(1);
        if (this.tiles.wrap) this.cursor.pos
            .mod([this.tiles.wh[0], Infinity]);
        if (!this.tiles.map[this.cursor.pos[0]]?.[this.cursor.pos[1]])
            this.render.updateDrawableVisible(this.cursor.draw, false);
        else
            this.tiles.updateTileDrawable(this.cursor.draw, screenPos, { type: this.cursor.tile });

        // draw frame
        this.render.draw();
        if (!this.settings)
            handleKeys(this.window);
        if (this.window.getMouseButton(0)) {
            if (this.settings)
                this.settings.fireClicks();
            // this.debugTiles.fireClicks();
        }

        this.stats.drawTime.time = (Date.now() - this.stats.drawTime.start) / 1000;
        this.stats.drawTime.times.push(this.stats.drawTime.time);
        if (this.stats.drawTime.times.length > this.stats.maxTimes)
            this.stats.drawTime.times.shift();
        this.stats.drawTime.start = Date.now();
        this.stats.drawTime.changed = true;
        // this.debugTiles.renderTiles();
    }
}

module.exports = MainGame;