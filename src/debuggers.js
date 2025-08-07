const { createCanvas } = require('canvas');
const Point = require('./point');
const TextWrapper = require('./renderer/src/util/text-wrapper');
const CanvasMeasurementProvider = require('./renderer/src/util/canvas-measurement-provider');

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
    tooltip = '';
    /** @type {number|null} */
    hoveredAt = null;
    constructor(render, layer, data, filler, w,h, x,y) {
        this.canvas = createCanvas(w,h);
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.draw = render.createDrawable(layer);
        this.skin = render.createBitmapSkin(this.canvas, 1, [0,0]);
        this.filler = filler.bind(this);
        render.updateDrawableSkinId(this.draw, this.skin);
        this.x = x;
        this.y = y;
        // decimal point precision makes blury outputs, avoid as much as possible
        render.updateDrawablePosition(this.draw, [Math.floor(x),Math.floor(y)]);
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
    maxWidth = 0;
    /** @type {DebuggerTile[]} */
    tiles = [];
    /** @type {import('./renderer/src/RenderWebGL')} */
    render = null;
    /** @type {object} */
    data = {};
    layer = 'debugger';
    /** @type {'down'|'up'|'left'|'right'} sets the direction that tiles will be stacked */
    direction = 'down';
    /** @type {'start'|'end'|'center'} sets where the columns will originate and align */
    alignmentColumn = 'start';
    /** @type {'start'|'end'|'center'} sets where the rows will originate and align*/
    alignmentRow = 'start';
    scrolls = false;
    tooltip = {
        /** @type {number} */
        draw: null,
        /** @type {number} */
        skin: null,
        /** @type {import('canvas').Canvas} */
        canvas: null,
        /** @type {import('canvas').CanvasRenderingContext2D} */
        ctx: null,
        visible: false,
        /** @type {CanvasMeasurementProvider} */
        measure: null,
        /** @type {TextWrapper} */
        wrapper: null,
        tooltip: ''
    };
    scroll = {
        lastOffset: -1,
        offset: 0,
        /** @type {import('canvas').Canvas} */
        canvas: null,
        /** @type {import('canvas').CanvasRenderingContext2D} */
        ctx: null,
        /** @type {number} */
        draw: null,
        /** @type {number} */
        skin: null
    }
    /** @type {import('glfw-raub').Window} */
    window = null;
    constructor(w,h, layer = 'debugger', render, window, dataCab) {
        this.width = w;
        this.height = h;
        this.tiles = [];
        this.layer = layer;
        this.data = dataCab;
        this.render = render;
        this.cursor[0] = this.rootColumn;
        this.cursor[1] = this.rootRow;
        this.window = window;
        this.tooltip.draw = this.render.createDrawable('tooltip');
        this.tooltip.canvas = createCanvas(1,1);
        this.tooltip.ctx = this.tooltip.canvas.getContext('2d', { willReadFrequently: true });
        this.tooltip.skin = this.render.createBitmapSkin(this.tooltip.canvas, 1, [-2.5, -2.5]);
        this.render.updateDrawableSkinId(this.tooltip.draw, this.tooltip.skin);
        this.tooltip.measure = new CanvasMeasurementProvider(this.tooltip.ctx);
        this.tooltip.wrapper = new TextWrapper(this.tooltip.measure);
        this.scroll.canvas = createCanvas(6, this.height);
        this.scroll.ctx = this.scroll.canvas.getContext('2d');
        this.scroll.draw = this.render.createDrawable('tooltip');
        this.scroll.skin = this.render.createBitmapSkin(this.scroll.canvas, 1, [5,this.scroll.canvas.height / 2]);
        this.render.updateDrawableSkinId(this.scroll.draw, this.scroll.skin);
    }
    createTile(func, onclick, w,h, tooltip) {
        if (typeof onclick !== 'function') {
            tooltip = h;
            h = w;
            w = onclick;
            onclick = null;
        }
        const pos = this.makePosition(w,h);
        const tile = new DebuggerTile(this.render, this.layer, this.data, func, w,h, pos[0],pos[1]);
        tile.renderContent();
        tile.tooltip = tooltip || '';
        tile.onclick = onclick;
        this.tiles.push(tile);
        if (this.alignmentColumn === 'center' || this.alignmentRow === 'center')
            this.resetPositions();
    }
    get rootColumn() {
        switch (this.alignmentColumn) {
        case 'start': return -this.width / 2;
        case 'center':
            const right = this.tiles.reduce((c,v) => Math.max(c, v.x + v.width), -Infinity);
            const left = this.tiles.reduce((c,v) => Math.min(c, v.x), Infinity);
            const width = right - left;
            return -width / 2;
        case 'end': return this.width / 2;
        }
    }
    get rootRow() {
        switch (this.alignmentRow) {
        case 'start': return this.height / 2;
        case 'center':
            const top = this.tiles.reduce((c,v) => Math.max(c, v.y), -Infinity);
            const bottom = this.tiles.reduce((c,v) => Math.min(c, v.y - v.height), Infinity);
            const height = top - bottom;
            return height / 2;
        case 'end': return -this.height / 2;
        }
    }
    resetPositions() {
        this.maxWidth = 0;
        this.cursor[0] = this.rootColumn;
        this.cursor[1] = this.rootRow;
        // redo positions
        for (const tile of this.tiles) {
            const pos = this.makePosition(tile.width, tile.height);
            tile.x = pos[0];
            tile.y = pos[1];
        }
    }
    makePosition(w,h) {
        switch (this.direction) {
        case 'down': {
            this.maxWidth = Math.max(this.maxWidth, w);
            if ((this.cursor[1] - h) <= (-this.height / 2) && !this.scrolls) {
                this.cursor[0] += this.maxWidth;
                this.cursor[1] = this.rootRow;
            }
            const res = this.cursor.clone();
            this.cursor[1] -= h;
            return res;
        }
        case 'up': {
            this.maxWidth = Math.max(this.maxWidth, w);
            this.cursor[1] += h;
            if (this.cursor[1] >= (this.height / 2) && !this.scrolls) {
                this.cursor[0] += this.maxWidth;
                this.cursor[1] = this.rootRow;
            }
            const res = this.cursor.clone();
            return res;
        }
        case 'right': {
            this.maxWidth = Math.max(this.maxWidth, h);
            if ((this.cursor[0] + w) >= (this.width / 2) && !this.scrolls) {
                this.cursor[1] -= this.maxWidth;
                this.cursor[0] = this.rootColumn;
            }
            const res = this.cursor.clone();
            this.cursor[0] += w;
            return res;
        }
        case 'left': {
            this.maxWidth = Math.max(this.maxWidth, h);
            this.cursor[0] -= w;
            if (this.cursor[0] <= (-this.width / 2) && !this.scrolls) {
                this.cursor[1] -= this.maxWidth;
                this.cursor[0] = this.rootColumn;
            }
            const res = this.cursor.clone();
            return res;
        }
        }
    }
    renderTiles() {
        let hovering = false;
        let tooltip = '';
        const cursorX = this.window.cursorPos.x - (this.width / 2);
        const cursorY = -this.window.cursorPos.y + (this.height / 2);
        this.tiles.forEach(tile => {
            // skip anything we cant see
            if (tile.x < ((-this.width / 2) - tile.width) || tile.x > this.width / 2) return;
            if (tile.y < (-this.height / 2) || tile.y > ((this.height / 2) + tile.height)) return;
            if (cursorX > tile.x && cursorX < (tile.x + tile.width) &&
                cursorY < tile.y && cursorY > (tile.y - tile.height)) {
                hovering = true;
                tile.hoveredAt ??= Date.now();
                tooltip = tile.tooltip;
                if ((Date.now() - tile.hoveredAt) > 1000 && !this.tooltip.visible)
                    this.tooltip.visible = true;
            } else tile.hoveredAt = null;
            tile.renderContent();
        });
        if (!hovering)
            this.tooltip.visible = false;
        this.render.updateDrawableVisible(this.tooltip.draw, this.tooltip.visible);
        this.render.updateDrawablePosition(this.tooltip.draw, [cursorX, cursorY]);
        if (this.tooltip.tooltip !== tooltip) {
            this.tooltip.tooltip = tooltip;
            this.tooltip.ctx.font = '20px';
            this.tooltip.ctx.textBaseline = 'top';
            const lines = this.tooltip.wrapper.wrapText(Math.min(this.width - this.window.cursorPos.x, 500), tooltip);
            const measures = this.tooltip.ctx.measureText(tooltip);
            const lineHeight = Math.abs(measures.actualBoundingBoxAscent) + Math.abs(measures.actualBoundingBoxDescent);
            const maxWidth = lines
                .map(line => this.tooltip.measure.measureText(line))
                .reduce((c,v) => Math.max(c, v), 0);
            this.tooltip.ctx.resetTransform();
            this.tooltip.ctx.clearRect(0,0, this.tooltip.canvas.width, this.tooltip.canvas.height);
            const width = this.tooltip.canvas.width = maxWidth;
            const height = this.tooltip.canvas.height = lines.length * lineHeight;
            this.tooltip.ctx.scale(1, -1);
            this.tooltip.ctx.translate(0, -height);
            if (!width || !height) return;
            this.tooltip.ctx.fillStyle = '#0000002f';
            this.tooltip.ctx.strokeStyle = '#3d3b3b2f';
            this.tooltip.ctx.lineWidth = 2;
            this.tooltip.ctx.fillRect(0,0, width,height);
            this.tooltip.ctx.strokeRect(0,0, width, height);
            this.tooltip.ctx.fillStyle = 'white';
            this.tooltip.ctx.strokeStyle = 'black';
            this.tooltip.ctx.lineWidth = 1;
            this.tooltip.ctx.font = '20px';
            this.tooltip.ctx.textBaseline = 'top';
            let y = 0;
            for (const line of lines) {
                this.tooltip.ctx.strokeText(line, 0,y);
                this.tooltip.ctx.fillText(line, 0,y);
                y += lineHeight;
            }
            const { data } = this.tooltip.ctx.getImageData(0,0, width, height);
            const image = Image.fromPixels(width, height, 32, Buffer.from(data));
            this.render.updateBitmapSkin(this.tooltip.skin, image, 1, [-10,-2]);
        }
        if (this.scrolls) {
            const right = this.tiles.reduce((c,v) => Math.max(c, v.x + v.width), -Infinity) - 3;
            this.render.updateDrawablePosition(this.scroll.draw, [right, 0]);
            if (this.scroll.offset !== this.scroll.lastOffset) {
                this.scroll.lastOffset = this.scroll.offset;
                this.scroll.ctx.clearRect(0,0, this.scroll.canvas.width, this.scroll.canvas.height);
                this.scroll.ctx.fillStyle = 'red';
                this.scroll.ctx.fillRect(0,0, 6, 64);
                const { data } = this.scroll.ctx.getImageData(0,0, this.scroll.canvas.width, this.scroll.canvas.height);
                const image = Image.fromPixels(this.scroll.canvas.width, this.scroll.canvas.height, 32, Buffer.from(data));
                this.render.updateBitmapSkin(this.scroll.skin, image, 1, [5, this.scroll.canvas.height / 2]);
            }
        }
    }
    fireClicks() {
        const cursorX = this.window.cursorPos.x - (this.width / 2);
        const cursorY = -this.window.cursorPos.y + (this.height / 2);
        const tile = this.tiles.find(tile => 
                cursorX > tile.x && cursorX < (tile.x + tile.width) &&
                cursorY < tile.y && cursorY > (tile.y - tile.height));
        tile?.onclick?.(cursorX - tile.x, cursorY - tile.y);
    }
}
module.exports = { DebuggerTile, DebuggerTiles };