const { init: initFrame } = require("3d-core-raub");
const { Assets } = require("./assets.js");
const { createCanvas } = require('canvas');
const WebGLRenderer = require('./renderer/src/index.js');
const path = require('node:path');
const { hsvToRgb } = require('./renderer/src/util/color-conversions.js');

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

// debugger canvas
const debug = createCanvas(256,256);
const ctx = debug.getContext('2d', { willReadFrequently: true });

(async () => {
    await loadingAssets;
    /** @param {import('canvas').CanvasRenderingContext2D} ctx  */
    const debugSkin = render.createBitmapSkin(debug, 1, [0,0]);
    const debugDraw = render.createDrawable('gui');
    render.updateDrawableSkinId(debugDraw, debugSkin);
    render.updateDrawablePosition(debugDraw, [-window.width / 2, window.height / 2]);
    const draw = render.createDrawable('main');
    const skin = render.createBitmapSkin(assets.get('icon').loaded, 1);
    render.updateDrawableSkinId(draw, skin);
    
    loop(t => {
        // draw frame
        render.updateDrawableScale(draw, [(Math.sin(t / 500) * 10) + 100, (Math.cos(t / 500) * 10) + 100]);
        render.draw();

        // calculate stats
        dt = (Date.now() - start) / 1000;
        start = Date.now();
        dts.push(dt);
        if (dts.length > maxDts) dts.shift();

        // draw debug info
        ctx.resetTransform();
        ctx.clearRect(0,0, debug.width, debug.height);
        ctx.scale(1, -1);
        ctx.translate(0, -debug.height);
        const avg = dts.reduce((c,v) => c + v, 0) / dts.length;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.font = '20px';
        const dtTxt = `DT: ${dt}`;
        ctx.strokeText(dtTxt, 0,17);
        ctx.fillText(dtTxt, 0,17);
        const fpsTxt = `FPS: ${(1 / dt).toFixed(2)} (${Math.round(1 / avg)})`;
        ctx.strokeText(fpsTxt, 0,34);
        ctx.fillText(fpsTxt, 0,34);
        ctx.fillStyle = '#444';
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;

        const height = 128;
        const width = 256;
        ctx.fillRect(0, 40, width, height);
        ctx.strokeRect(0, 40, width, height);
        const max = dts.reduce((c,v) => Math.max(c,1 / v), 0);
        for (let i = 0, plot = dts[i]; i < dts.length; plot = dts[++i]) {
            const fps = 1 / plot;
            const len = (fps / max) * height;
            const [r,g,b] = hsvToRgb([(Math.min(fps / idealFps, 1) * 128) / 360, 0.5, 1], []);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect((i / maxDts) * width, (height - len) + 40, width / maxDts, len);
        }

        const { data } = ctx.getImageData(0,0, debug.width, debug.height);
        const image = Image.fromPixels(debug.width, debug.height, 32, Buffer.from(data));
        render.updateBitmapSkin(debugSkin, image, 1, [0,0]);
        render.updateDrawablePosition(debugDraw, [-window.width / 2, window.height / 2]);
    });
})();