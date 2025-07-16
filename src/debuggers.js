const { createCanvas } = require('canvas');
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
        this.skin = render.createBitmapSkin(this.canvas);
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
        this.filler(this.ctx, this.data);
        const { data } = this.ctx.getImageData(0,0, this.canvas.width, this.canvas.height);
        const image = Image.fromPixels(this.canvas.width, this.canvas.height, 32, Buffer.from(data));
        this.render.updateBitmapSkin(this.skin, image, 1, [0,0]);
        this.render.updateDrawablePosition(this.draw, [this.x,this.y]);
    }
}
class DebuggerTiles {
    /** @type {number} */
    width = 0;
    /** @type {number} */
    height = 0;
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
    }
    createTile(func, w,h) {
        const parent = this.tiles.find(tile => (tile.y - tile.height - h) < (-this.height / 2));
        const parentPos = parent 
            ? [parent.x, parent.y - parent.height] 
            : this.tiles.length <= 0 
                ? [-this.width / 2,this.height / 2]
                : [(this.width / 2) - w, this.height / 2];
        const tile = new DebuggerTile(this.render, this.data, func, w,h, parentPos[0],parentPos[1]);
        tile.renderContent();
        this.tiles.push(tile);
    }
    renderTiles() {
        this.tiles.forEach(tile => tile.renderContent());
    }
}
module.exports = { DebuggerTile, DebuggerTiles };