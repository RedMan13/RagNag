const { init: initFrame } = require("3d-core-raub");
const { Assets } = require("./assets.js");
const { createCanvas } = require('canvas');
const WebGLRenderer = require('./renderer/src/index.js');
const path = require('node:path');
const { hsvToRgb } = require('./renderer/src/util/color-conversions.js');
const fs = require('fs');

// find a somewhere to expect our none-code files to exist in
const hostDir = process.env.HOST || path.resolve('.');
const assets = global.assets = new Assets();
assets.addSource(path.resolve(hostDir, 'assets'));
const loadingAssets = Promise.all([
    // add the icon to the app as close to immediately after load as we can
    assets.registerAsset('icon', 'icon.png').then(() => window.icon = assets.get('icon').loaded),
    assets.registerAsset('sprite-vert', 'shaders/sprite.vert.glsl'),
    assets.registerAsset('sprite-frag', 'shaders/sprite.frag.glsl')
]);

// get gl instance
const {
    window,
    canvas,
    loop,
    Image
} = initFrame({ isGles3: true, isWebGL2: true, title: 'Rag Nag' });

// setup renderer
const render = new WebGLRenderer(canvas, -window.width / 2, window.width / 2, window.height / 2, -window.height / 2, 0, 16);
window.on('resize', () => {
    render.setStageSize(
        -window.width / 2,
        window.width / 2,
        -window.height / 2,
        window.height / 2
    );
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
    const skin = render.createBitmapSkin(assets.get('icon').loaded, 1);
    let cam = [0,0];
    const tileSize = [20,20];
    const tilesWide = Math.ceil(window.width / tileSize[0]) +2;
    const tilesTall = Math.ceil(window.height / tileSize[1]) +2;
    const reserve = tilesWide * tilesTall;
    const map = new Array(2048).fill(0).map(() => new Array(2048).fill(0).map(() => [1]));
    const drawTiles = [];
    const fallbackTile = 1;
    const tileTypes = [null, skin];
    for (let i = 0, x = 0, y = 0; i < reserve; x = ++i % tilesWide, y = Math.floor(i / tilesWide)) {
        const draw = render.createDrawable('main');
        render.updateDrawableSkinId(draw, skin);
        render.updateDrawablePosition(draw, [
            (((x * tileSize[0]) + tileSize[0] / 2) - (window.width / 2)) - tileSize[0], 
            (((y * tileSize[1]) + tileSize[1] / 2) - (window.height / 2)) - tileSize[1]
        ]);
        const [sx,sy] = render._allSkins[skin].size;
        render.updateDrawableScale(draw, [(tileSize[0] / sx) * 100, (tileSize[1] / sy) * 100]);
        drawTiles.push(draw);
    }
    
    const startedAt = Date.now();
    loop(t => {
        drawTiles.forEach((draw, idx) => {
            const x = idx % tilesWide;
            const y = Math.floor(idx / tilesWide);
            render.updateDrawablePosition(draw, [
                ((((x * tileSize[0]) + tileSize[0] / 2) - (window.width / 2)) - tileSize[0]) + (cam[0] % tileSize[0]),
                ((((y * tileSize[1]) + tileSize[1] / 2) - (window.height / 2)) - tileSize[1]) + (cam[1] % tileSize[1])
            ]);
            const mx = x - Math.floor(cam[0] / tileSize[0]);
            const my = y - Math.floor(cam[1] / tileSize[1]);
            const [type] = map[mx]?.[my] ?? [];
            if (!tileTypes[type])
                return render.updateDrawableVisible(draw, false);
            render.updateDrawableVisible(draw, true);
            if (!render._allSkins[tileTypes[type]]) 
                return render.updateDrawableSkinId(draw, tileTypes[fallbackTile]);
            render.updateDrawableSkinId(draw, tileTypes[type]);
        });
        cam[0] = (t - startedAt) / 50;
        cam[1] = (t - startedAt) / 50;
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