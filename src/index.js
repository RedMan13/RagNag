const { init: initFrame } = require("3d-core-raub");
const { Assets } = require("./assets.js");
const TileSpace = require('./tile-drawing.js');
const { createCanvas, ImageData } = require('canvas');
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
window.on('resize', () => {
    render.setStageSize(
        -window.width / 2,
        window.width / 2,
        -window.height / 2,
        window.height / 2
    );
    windowSize[0] = window.width;
    windowSize[1] = window.height;
});
render.setBackgroundColor(0,0,0,0);
render.setLayerGroupOrdering(['temp', TileSpace.drawableLayer, 'cursor', 'debugger']);
const tiles = new TileSpace(window, render, 20,20, 20,20);

// stats for days :money_mouth:
let start = Date.now();
let dt = 1;
const dts = [];
const maxDts = 100;
const idealFps = 60;

// stats debugger canvas
const debug = createCanvas(256,256);
const ctx = debug.getContext('2d', { willReadFrequently: true });
const debugSkin = render.createBitmapSkin(debug, 1, [0,0]);
const debugDraw = render.createDrawable('debugger');
render.updateDrawableSkinId(debugDraw, debugSkin);
render.updateDrawablePosition(debugDraw, [-window.width / 2, window.height / 2]);

(async () => {
    await loadingAssets;
    await tiles.loadAssets(assets);
    
    let cursor = 1;
    let cursorPos = 0;
    const cursorDraw = render.createDrawable('cursor');
    render.updateDrawableVisible(cursorDraw, false);

    keys['Camera Left']     = [[names.A], false, () => tiles.camera.pos[0] -= 200 * dt, 'Moves the debug/painting camera left'];
    keys['Camera Right']    = [[names.D], false, () => tiles.camera.pos[0] += 200 * dt, 'Moves the debug/painting camera right'];
    keys['Camera Up']       = [[names.W], false, () => tiles.camera.pos[1] -= 200 * dt, 'Moves the debug/painting camera up'];
    keys['Camera Down']     = [[names.S], false, () => tiles.camera.pos[1] += 200 * dt, 'Moves the debug/painting camera down'];
    keys['Camera Zoom In']  = [[names.ShiftLeft], false, () => tiles.camera.scale.add(2 * dt), 'Zooms the debug/painting camera in'];
    keys['Camera Zoom Out'] = [[names.ControlLeft], false, () => tiles.camera.scale.sub(2 * dt), 'Zooms the debug/painting camera out'];
    keys['Place Tile']      = [[names.MouseLeft], false, () => {
        if (!(cursorPos in tiles.map)) return;
        map[cursorPos] = [cursor];
    }, 'Sets the type of the currently hovered tile to the selected type']

    loop(t => {
        const screenPos = tiles.screenToWorld(window.cursorPos.x, window.cursorPos.y);
        cursorPos = screenPos.clone()
            .add([tiles.wh[0] * 2, 0])
            .sub(tiles.camera.pos.clone().div(tiles.tileWh).clamp(1))
            .mod([tiles.wh[0], Infinity])
            .toIndex(tiles.wh[0]);
        if (!(cursorPos in tiles.map))
            render.updateDrawableVisible(cursorDraw, false);
        else
            tiles.updateTileDrawable(cursorDraw, screenPos, [cursor]);
        tiles.draw();

        // draw frame
        render.draw();
        handleKeys(window);

        // calculate stats
        dt = (Date.now() - start) / 1000;
        start = Date.now();
        dts.push(dt);
        if (dts.length > maxDts) dts.shift();

        // draw debug info
        ctx.antialias = 'default';
        ctx.textBaseline = 'alphabetic';
        let y = 0;
        ctx.resetTransform();
        ctx.clearRect(0,0, debug.width, debug.height);
        ctx.scale(1, -1);
        ctx.translate(0, -debug.height);
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

        const { data } = ctx.getImageData(0,0, debug.width, debug.height);
        const image = Image.fromPixels(debug.width, debug.height, 32, Buffer.from(data));
        render.updateBitmapSkin(debugSkin, image, 1, [0,0]);
        render.updateDrawablePosition(debugDraw, [-window.width / 2, window.height / 2]);
    });
})();