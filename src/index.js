const { Assets } = require("./assets.js");
const TileSpace = require('./tile-drawing.js');
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
        tooltip: 'tooltip'
    };

    assets = new Assets(path.resolve(hostDir, 'assets'));
    stats = {
        start: Date.now(),
        dt: 1,
        dts: [],
        maxDts: 100,
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

    constructor(window, canvas) {
        this.window = window;
        this.canvas = canvas;
        this._initKeys();
    }
    _initRenderer() {
        this.render = new WebGLRenderer(this.canvas, -this.window.width / 2, this.window.width / 2, this.window.height / 2, -this.window.height / 2);
        this.render.renderOffscreen = false;
        this.render.setBackgroundColor(0,0,0,0);
        this.render.setLayerGroupOrdering(Object.values(MainGame.layers));

        this.window.on('resize', () => {
            this.render.setStageSize(
                -this.window.width / 2,
                this.window.width / 2,
                -this.window.height / 2,
                this.window.height / 2
            );
            this.debugTiles.width = this.window.width;
            this.debugTiles.height = this.window.height;
        });
    }
    _initDebugTiles() {
        this.debugTiles = new DebuggerTiles(this.window.width, this.window.height, MainGame.layers.debuggers, this.render, window, this.stats);
        this.debugTiles.direction = 'right';
        this.debugTiles.resetPositions();
        this.debugTiles.createTile(function(ctx, { dt, dts, maxDts, idealFps }) {
            ctx.antialias = 'default';
            ctx.textBaseline = 'alphabetic';
            let y = 0;
            ctx.resetTransform();
            ctx.clearRect(0,0, this.width, this.height);
            ctx.scale(1, -1);
            ctx.translate(0, -this.height);
            const avg = dts.reduce((c,v) => c + v, 0) / dts.length;
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.font = '20px';
            const dtTxt = `DT: ${dt} (${avg})`;
            ctx.strokeText(dtTxt, 0,y += 17);
            ctx.fillText(dtTxt, 0,y);
            const fpsTxt = `FPS: ${(1 / dt).toFixed(2)} (${Math.round(1 / avg)})`;
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
            const max = dts.reduce((c,v) => Math.max(c,1 / v), 0);
            for (let i = 0, plot = dts[i]; i < dts.length; plot = dts[++i]) {
                const fps = 1 / plot;
                const len = (fps / max) * height;
                const rgb = hsvToRgb([(Math.min(fps / idealFps, 1) * 128) / 360, .5, 1], []);
                ctx.fillStyle = `rgb(${rgb})`;
                ctx.fillRect((i / maxDts) * width, (height - len) + y, width / maxDts, len);
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
        }, 256, 256, 'Speed statistics, like FPS and Delta Time');
        const game = this;
        this.debugTiles.createTile(function(ctx) {
            ctx.antialias = 'default';
            ctx.textBaseline = 'alphabetic';
            let y = 0;
            ctx.resetTransform();
            ctx.clearRect(0,0, this.width, this.height);
            ctx.scale(1, -1);
            ctx.translate(0, -this.height);
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
        this.tiles = new TileSpace(this.window, this.render, 20,20, 400,100, true);
        this.tiles.loadAssets(this.assets);
        this.entities = new Physics(this.tiles, this.render);
        this.entities.loadAssets(this.assets);
        this.player = this.entities.createEntity(180,180, 'player');
        fs.readFile('./save.json', 'utf8', (err, data) => {
            if (err) return;
            if (data.length < 2) return;
            this.tiles.map = JSON.parse(data);
        });
    }
    _initKeys() {
        keys['Open Settings']         = [[names.Escape],    true,  () => this.settings = new Settings(this.render, window), 'Opens the settings and exit menu'];
        keys['Camera Left']           = [[names.A],         false, () => this.camOff[0] -= 200 * this.stats.dt, 'Moves the debug/painting camera left'];
        keys['Camera Right']          = [[names.D],         false, () => this.camOff[0] += 200 * this.stats.dt, 'Moves the debug/painting camera right'];
        keys['Camera Up']             = [[names.W],         false, () => this.camOff[1] += 200 * this.stats.dt, 'Moves the debug/painting camera up'];
        keys['Camera Down']           = [[names.S],         false, () => this.camOff[1] -= 200 * this.stats.dt, 'Moves the debug/painting camera down'];
        keys['Player Go To']          = [[names.E],         false, () => { this.movingPlayer = true; this.entities.moveEntity(this.player, (this.cursor.pos[0] * this.tiles.tileWh[0]) - (this.window.width / 2), (this.cursor.pos[1] * this.tiles.tileWh[1]) - (this.window.height / 2)) }]
        keys['Clear Camera Position'] = [[names.Q],         false, () => this.camOff.set(0,0), 'Resets the offset curently given to the camera'];
        keys['Jump']                  = [[names.M],         false, () => {
            if (!this.entities.entities[this.player].gravity)
                return this.entities.nudgeEntity(this.player, 0,20);
            if (!this.entities.entities[this.player]?.collided) return;
            switch (this.entities.entities[this.player]?.collided) {
            case 'left':
                this.entities.nudgeEntity(this.player, 200,7.5); break;
            case 'right':
                this.entities.nudgeEntity(this.player, -200,7.5); break;
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
            this.tiles.map[this.cursor.pos[0]][this.cursor.pos[1]] = [this.cursor.tile];
        }, 'Sets the type of the currently hovered tile to the selected type'];
        keys['Save Map']              = [[names.ControlLeft, names.S], false, () => fs.writeFile('./save.json', JSON.stringify(this.tiles.map), err => { if (err) throw err; }), 'Saves the current map data into save.json'];
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

            this.assets.registerAsset('unopened', 'tiles/unopened.png'),
            this.assets.registerAsset('flagged', 'tiles/flagged.png'),
            this.assets.registerAsset('zero-bombs', 'tiles/0-bombs.png'),
            this.assets.registerAsset('one-bomb', 'tiles/1-bombs.png'),
            this.assets.registerAsset('two-bombs', 'tiles/2-bombs.png'),
            this.assets.registerAsset('three-bombs', 'tiles/3-bombs.png'),
            this.assets.registerAsset('four-bombs', 'tiles/4-bombs.png'),
            this.assets.registerAsset('five-bombs', 'tiles/5-bombs.png'),
            this.assets.registerAsset('six-bombs', 'tiles/6-bombs.png'),
            this.assets.registerAsset('seven-bombs', 'tiles/7-bombs.png'),
            this.assets.registerAsset('eight-bombs', 'tiles/8-bombs.png'),
            this.assets.registerAsset('bomb', 'tiles/bomb.png'),

            this.assets.registerAsset('pang', 'entities/penguin.svg')
        ]);
    }
    start() {
        // for (let i = 0; i < 200; i++)
        //     this.entities.createEntity(140,20, 'error');
        setInterval(() => {
            if (!this.settings)
                this.entities.tick();
        }, 1/20);
        this.window.loop(this.drawFrame.bind(this));
    }
    drawFrame() {
        const screenPos = this.tiles.screenToWorld(this.window.cursorPos.x, this.window.cursorPos.y);
        this.cursor.pos = screenPos.clone()
            .add(this.tiles.camera.pos.clone().div(this.tiles.tileWh))
            .sub(this.tiles.screenWh.clone().div(2))
            .clamp(1)
            .mod([this.tiles.wh[0], Infinity]);
        if (!this.tiles.map[this.cursor.pos[0]]?.[this.cursor.pos[1]])
            this.render.updateDrawableVisible(this.cursor.draw, false);
        else
            this.tiles.updateTileDrawable(this.cursor.draw, screenPos, [this.cursor.tile]);
        const target = this.entities.entities[this.player].pos.clone();
        const distance = target.clone().scale(-1,1).sub(this.tiles.camera.pos);
        if (!this.movingPlayer) {
            this.tiles.camera.pos = this.camOff.clone()
                .add(this.tiles.camera.pos)
                .add(distance.mul(0.20));
        }
        this.movingPlayer = false;
        this.tiles.draw();
        this.entities.draw();
        if (this.settings)
            this.settings.draw();

        // draw frame
        this.render.draw();
        if (!this.settings)
            handleKeys(this.window);
        if (this.window.getMouseButton(0)) {
            if (this.settings)
                this.settings.fireClicks();
            this.debugTiles.fireClicks();
        }

        this.stats.dt = (Date.now() - this.stats.start) / 1000;
        this.stats.dts.push(this.stats.dt);
        if (this.stats.dts.length > this.stats.maxDts)
            this.stats.dts.shift();
        this.stats.start = Date.now();
        this.debugTiles.renderTiles();
    }
}

module.exports = MainGame;