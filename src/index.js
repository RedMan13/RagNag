const { init: initFrame } = require("3d-core-raub");
const { Assets } = require("./assets.js");
const TileSpace = require('./tile-drawing.js');
const { DebuggerTiles } = require('./debuggers.js');
const { ImageData } = require('canvas');
global.window = {};
global.window.ImageData = ImageData;
const WebGLRenderer = require('./renderer/src/index.js');
const path = require('node:path');
const { hsvToRgb } = require('./renderer/src/util/color-conversions.js');
const Point = require('./point.js');
const { keys, handleKeys, names } = require('./key-actions.js');
const fs = require('fs');

// find a somewhere to expect our none-code files to exist in
const hostDir = process.env.HOST || path.resolve('.');
const assets = global.assets = new Assets();
assets.addSource(path.resolve(hostDir, 'assets'));
const loadingAssets = Promise.all([
    // add the icon to the app as close to immediately after load as we can
    assets.registerAsset('icon', 'icon.png').then(icon => window.icon = icon),
    assets.registerAsset('sprite-vert', 'shaders/sprite.vert.glsl'),
    assets.registerAsset('sprite-frag', 'shaders/sprite.frag.glsl'),
]);

// get gl instance
const {
    window,
    canvas,
    loop,
    Image
} = initFrame({ isGles3: true, isWebGL2: true, title: 'Rag Nag' });
window.ImageData = ImageData;
const windowSize = new Point(window.width, window.height);

// setup renderer
const render = new WebGLRenderer(canvas, -window.width / 2, window.width / 2, window.height / 2, -window.height / 2, 0, 16);
render.renderOffscreen = false;
render.setBackgroundColor(0,0,0,0);
render.setLayerGroupOrdering(['temp', TileSpace.drawableLayer, 'cursor', 'debugger']);
let cursor = TileSpace.tiles.error;
let cursorPos = new Point(0,0);
const cursorDraw = render.createDrawable('cursor');
render.updateDrawableVisible(cursorDraw, false);
const tiles = new TileSpace(window, render, 20,20, 400,100);
const stats = {
    start: Date.now(),
    dt: 1,
    dts: [],
    maxDts: 100,
    idealFps: 60
};
const debugTiles = new DebuggerTiles(window.width, window.height, render, stats);
window.on('resize', () => {
    render.setStageSize(
        -window.width / 2,
        window.width / 2,
        -window.height / 2,
        window.height / 2
    );
    windowSize[0] = window.width;
    windowSize[1] = window.height;
    debugTiles.width = window.width;
    debugTiles.height = window.height;
});

debugTiles.createTile(function(ctx, { dt, dts, maxDts, idealFps }) {
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
    const countTxt = `Count: ${render._allDrawables.length} (${render._allSkins.length})`;
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
}, 256, 256);
debugTiles.createTile(function(ctx) {
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
    const posText = `XY: [${tiles.camera.pos.map(num => num.toFixed(0)).join(', ')}]`;
    ctx.strokeText(posText, 0,y += 17);
    ctx.fillText(posText, 0,y);
    const tilePosText = `tXtY: [${tiles.camera.pos.clone().div(tiles.tileWh).map(num => num.toFixed(0)).join(', ')}]`;
    ctx.strokeText(tilePosText, 0,y += 17);
    ctx.fillText(tilePosText, 0,y);
    const cursorText = `cursor: ${cursor} [${cursorPos.map(num => num.toFixed(0)).join(', ')}]`;
    ctx.strokeText(cursorText, 0,y += 17);
    ctx.fillText(cursorText, 0,y);
    const tilesText = `Tiles: ${tiles.wh[0] * tiles.wh[1]} [${tiles.wh.join(', ')}]`;
    ctx.strokeText(tilesText, 0,y += 17);
    ctx.fillText(tilesText, 0,y);
}, 256, 128);

(async () => {
    await loadingAssets;
    await tiles.loadAssets(assets);

    keys['Camera Left']     = [[names.A], false, () => tiles.camera.pos[0] -= 200 * stats.dt, 'Moves the debug/painting camera left'];
    keys['Camera Right']    = [[names.D], false, () => tiles.camera.pos[0] += 200 * stats.dt, 'Moves the debug/painting camera right'];
    keys['Camera Up']       = [[names.W], false, () => tiles.camera.pos[1] += 200 * stats.dt, 'Moves the debug/painting camera up'];
    keys['Camera Down']     = [[names.S], false, () => tiles.camera.pos[1] -= 200 * stats.dt, 'Moves the debug/painting camera down'];
    keys['Place Tile']      = [[names.MouseLeft], false, () => {
        if (!(cursorPos in tiles.map)) return;
        map[cursorPos] = [cursor];
    }, 'Sets the type of the currently hovered tile to the selected type']

    loop(t => {
        const screenPos = tiles.screenToWorld(window.cursorPos.x, window.cursorPos.y);
        cursorPos = screenPos.clone().add(tiles.camera.pos.clone().div(tiles.tileWh));
        /*if (cursorPos[0] > tiles.wh[0] || cursorPos[0] < 0 ||cursorPos[1] > tiles.wh[1] || cursorPos[1] < 0 )
            render.updateDrawableVisible(cursorDraw, false);
        else*/
            tiles.updateTileDrawable(cursorDraw, screenPos, [cursor]);
        tiles.draw();

        // draw frame
        render.draw();
        handleKeys(window);


        // calculate stats
        stats.dt = (Date.now() - stats.start) / 1000;
        stats.start = Date.now();
        stats.dts.push(stats.dt);
        if (stats.dts.length > stats.maxDts) stats.dts.shift();
        debugTiles.renderTiles();
    });
})();