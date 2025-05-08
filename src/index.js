const { init: initFrame } = require("3d-core-raub");
const { Assets } = require("./assets.js");
const { createCanvas } = require('canvas');
const WebGLRenderer = require('./renderer/src/index.js');
const path = require('node:path');
const { hsvToRgb } = require('./renderer/src/util/color-conversions.js');
const Point = require('./point.js');
const fs = require('fs');

// find a somewhere to expect our none-code files to exist in
const hostDir = process.env.HOST || path.resolve('.');
const assets = global.assets = new Assets();
assets.addSource(path.resolve(hostDir, 'assets'));
const loadingAssets = Promise.all([
    // add the icon to the app as close to immediately after load as we can
    assets.registerAsset('icon', 'icon.png').then(() => window.icon = assets.get('icon').loaded),
    assets.registerAsset('sprite-vert', 'shaders/sprite.vert.glsl'),
    assets.registerAsset('sprite-frag', 'shaders/sprite.frag.glsl'),
    assets.registerAsset('generic', 'tiles/generic.svg')
]);

// get gl instance
const {
    window,
    canvas,
    loop,
    Image
} = initFrame({ isGles3: true, isWebGL2: true, title: 'Rag Nag' });
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
render.setLayerGroupOrdering(['main', 'gui']);

// stats for days :money_mouth:
let start = Date.now();
let dt = 1;
const dts = [];
const maxDts = 100;
const idealFps = 60;

// stats debugger canvas
const debug = createCanvas(256,256);
const ctx = debug.getContext('2d', { willReadFrequently: true });

(async () => {
    await loadingAssets;
    /** @param {import('canvas').CanvasRenderingContext2D} ctx  */
    const debugSkin = render.createBitmapSkin(debug, 1, [0,0]);
    const debugDraw = render.createDrawable('gui');
    render.updateDrawableSkinId(debugDraw, debugSkin);
    render.updateDrawablePosition(debugDraw, [-window.width / 2, window.height / 2]);
    const genericTile = render.createBitmapSkin(assets.get('generic').loaded, 1);
    const cam = new Point(0,0);
    let camRot = 0;
    const tileSize = new Point(20,20);
    const tilesSize = new Point(Math.max(...windowSize)).mul(1.15).div(tileSize).add(1).clamp(1).add(2);
    const map = new Array(4096).fill(0).map(() => new Array(1024).fill(0).map(() => [0]));
    const drawTiles = new Array(tilesSize[0] * tilesSize[1]).fill(-1).map(() => render.createDrawable('main'));
    const fallbackTile = 1;
    const tileTypes = [null, genericTile];
    function updateTileDraw(draw, idx) {
        const p = Point.fromGrid(idx, tilesSize[0]);
        render.updateDrawablePosition(draw, p.clone()
            .mul(tileSize) // move coords to screen space
            .add(tileSize.clone().div(2)) // offset forward by half a tile so tile center is bottom left
            .sub(tilesSize.clone().div(2).mul(tileSize)) // align all of these tiles as if they are one solid drawable
            .sub(tileSize) // offset back by one tile to abscure the left and bottom edges
            .add(cam.clone().mod(tileSize)) // offset by the camera, wrapping back around when necessary
            .rotate(camRot) // rotate by the camera rotation
        );
        render.updateDrawableDirection(draw, 180 - camRot);
        const mp = p.clone().sub(cam.clone().div(tileSize).clamp(1));
        const [type] = map[mp[0]]?.[mp[1]] ?? [];
        if (!tileTypes[type])
            return render.updateDrawableVisible(draw, false);
        render.updateDrawableVisible(draw, true);
        if (!render._allSkins[tileTypes[type]]) 
            return render.updateDrawableSkinId(draw, tileTypes[fallbackTile]);
        render.updateDrawableSkinId(draw, tileTypes[type]);
        const size = render._allDrawables[draw].skin.size;
        render.updateDrawableScale(draw, tileSize.clone().div(size).mul(100));
    }

    loop(t => {
        drawTiles.forEach(updateTileDraw);
        // draw frame
        render.draw();

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