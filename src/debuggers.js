const { createCanvas } = require('canvas');
const Point = require('./point');

class DebuggerTile {
    /** @type {import('canvas').Canvas} */
    canvas = null;
    /** @type {import('canvas').CanvasRenderingContext2D} */
    ctx = null;
    /** @type {number} */
    draw = null;
    /** @type {number} */
    skin = null;
    /** @type {number} */
    x = 0;
    /** @type {number} */
    y = 0;
    /** @type {import('./renderer/src/RenderWebGL')} */
    render = null;
    /** @type {object} */
    data = {};
    /** @type {(ctx: import('canvas').CanvasRenderingContext2D, data: object) => void} */
    filler = function(ctx) {}
    constructor(render, data, filler, w,h, x,y) {
        this.canvas = createCanvas(w,h);
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.draw = render.createDrawable('debuggers');
        this.skin = render.createBitmapSkin(this.canvas, 1, [0,0]);
        this.filler = filler.bind(this);
        render.updateDrawableSkinId(this.draw, this.skin);
        this.x = x;
        this.y = y;
        render.updateDrawablePosition(this.draw, [x,y]);
        this.render = render;
        this.data = data;
    }
    get width() { return this.canvas.width; }
    get height() { return this.canvas.height; }
    /**
     * Render the contents of this drawable tile
     */
    renderContent() {
        this.render.updateDrawablePosition(this.draw, [this.x,this.y]);
        const isOld = this.filler(this.ctx, this.data);
        // filler says they didnt do anything, so dont update image contents
        if (isOld) return;
        this.ctx.lineWidth = 2;
        this.ctx.lineJoin = 'miter';
        this.ctx.strokeStyle = 'red';
        this.ctx.beginPath();
        this.ctx.moveTo(0,0);
        this.ctx.lineTo(this.canvas.width, 0);
        this.ctx.lineTo(this.canvas.width, this.canvas.height);
        this.ctx.lineTo(0, this.canvas.height);
        this.ctx.closePath();
        this.ctx.stroke();
        const { data } = this.ctx.getImageData(0,0, this.canvas.width, this.canvas.height);
        const image = Image.fromPixels(this.canvas.width, this.canvas.height, 32, Buffer.from(data));
        this.render.updateBitmapSkin(this.skin, image, 1, [0,0]);
    }
}
class DebuggerTiles {
    /** @type {number} */
    width = 0;
    /** @type {number} */
    height = 0;
    cursor = new Point(0,0);
    columnWidth = 0;
    /** @type {DebuggerTile[]} */
    tiles = [];
    /** @type {import('./renderer/src/RenderWebGL')} */
    render = null;
    /** @type {object} */
    data = {};
    constructor(w,h, render, dataCab) {
        this.width = w;
        this.height = h;
        this.tiles = [];
        this.data = dataCab;
        this.render = render;
        this.cursor[0] = -this.width / 2;
        this.cursor[1] = this.height / 2;
    }
    createTile(func, w,h) {
        if ((this.cursor[1] - h) < (-this.height / 2)) {
            this.cursor[0] += this.columnWidth;
            this.cursor[1] = this.height / 2;
        }
        const tile = new DebuggerTile(this.render, this.data, func, w,h, this.cursor[0],this.cursor[1]);
        tile.renderContent();
        this.tiles.push(tile);
        this.columnWidth = Math.max(this.columnWidth, w);
        this.cursor[1] -= h;
    }
    renderTiles() {
        this.tiles.forEach(tile => tile.renderContent());
    }
}
module.exports = { DebuggerTile, DebuggerTiles };