const { createCanvas } = require('canvas');
const Point = require('./point.js');
const { XMLParser } = require('fast-xml-parser');
const Image = require('image-raub');

class Tile {
    /** @type {import('./renderer/src/RenderWebGL.js')} */
    render = null;
    /** @type {import('canvas').Canvas} */
    canvas = null;
    /** @type {import('canvas').CanvasRenderingContext2D} */
    ctx = null;
    /** @type {number} */
    drawable = null;
    /** @type {number} */
    skin = null;
    x = 0;
    y = 0;
    resized = false;
    width = 0;
    height = 0;
    id = '';
    constructor(render, x,y, width, height, id) {
        this.render = render;
        this.canvas = createCanvas(1, 1);
        this.ctx = this.canvas.getContext('2d');
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.drawable = this.render.createDrawable('settings');
        this.skin = this.render.createBitmapSkin(this.canvas, 1, [0,0]);
        this.id = id;
        this.draw();
    }
    getByID(id) {
        if (this.id === id) return this;
    }
    draw(percentages) {
        if (!this.ctx) return;
        const width = percentages ? this.width * this.render.getNativeSize()[0] : this.width;
        const height = percentages ? this.height * this.render.getNativeSize()[1] : this.height;
        this.render.updateDrawableSkinId(this.drawable, this.skin);
        this.render.updateDrawablePosition(this.drawable, this.x, this.y);
        this.render.updateDrawableScale(this.drawable, [
            (width / this.canvas.width) * 100,
            (height / this.canvas.height) * 100
        ]);
        if (!this.canvas.width || !this.canvas.height) return;
        const { data } = this.ctx.getImageData(0,0, this.canvas.width, this.canvas.height);
        const image = Image.fromPixels(this.canvas.width, this.canvas.height, 32, Buffer.from(data));
        this.render.updateBitmapSkin(this.skin, image, 1, [0,0]);
    }
}
class InputScreen extends Tile {
    padding = 0;
    /** @type {Tile[]} */
    tiles = null;
    constructor(render, padding, x = 0,y = 0, width = 1, height = 1, id) {
        super(render, x,y, width, height, id);
        this.padding = padding;
        this.tiles = [];
    }
    getByID(id) {
        if (this.id === id) return this;
        return this.tiles.find(tile => tile.id === id);
    }
    draw() {
        if (!this.tiles) return;
        const maxSize = new Point(0,0);
        const cursor = new Point(this.padding,this.padding);
        for (const tile of this.tiles) {
            tile.x = cursor[0];
            tile.y = cursor[1];
            tile.width = (this.width * this.render.getNativeSize()[0]) - (this.padding * 2);
            tile.draw();
            cursor.translate(0, tile.height);
            maxSize.max([tile.width, tile.height]);
        }
        this.width = maxSize[0];
        this.height = maxSize[1];
        super.draw(true);
    }
    fromXML(str) {
        const xmlLexes = new XMLParser({
            preserveOrder: true,
            allowBooleanAttributes: true,
            ignoreAttributes: false,
            attributeNamePrefix: '',
            trimValues: true
        }).parse(str);
        this._fromXMLLexes(xmlLexes);
    }
    _fromXMLLexes(lexes) {
        this.tiles = [];
        for (const lex of lexes) {
            const name = Object.keys(lex)[0];
            const children = Object.values(lex)[0];
            const attributes = lex[':@'] ?? {};
            switch (name) {
            // ignore
            case '#comment': break;
            case 'text':
            case '#text':
                this.tiles.push(new Text(this.render, children, null, null, this.width * this.render.getNativeSize()[0], null, attributes.id));
                break;
            case 'grid':
                const rows = (attributes.rows ?? '').split(/,\s*/g).map(Number);
                const columns = (attributes.columns ?? '').split(/,\s*/g).map(Number);
                const grid = new Grid(this.render, rows, columns, null, null, null, null, attributes.id);
                grid._fromXMLLexes(children);
                this.tiles.push(grid);
                break;
            case 'button':
                const button = new Button(this.render, '', null, null, null, null, attributes.id);
                button._fromXMLLexes(children);
                this.tiles.push(button);
                break;
            }
        }
    }
}
class Grid extends Tile {
    /** @type {Tile[]} */
    tiles = null;
    rows = [];
    columns = [];
    constructor(render, rows, columns, x,y, width, height, id) {
        super(render, x,y, width, height, id);
        this.tiles = [];
        this.render = render;
        this.rows = rows;
        this.columns = columns;
    }
    getByID(id) {
        if (this.id === id) return this;
        return this.tiles.find(tile => tile.id === id);
    }
    draw() {
        if (!this.tiles) return;
        const cursor = new Point(0,0);
        let column = 0;
        let row = 0;
        for (const tile of this.tiles) {
            tile.x = cursor[0];
            tile.y = cursor[1];
            tile.width = this.columns[column];
            // undefined rows will just be the height of the tile it contains
            if (!this.rows[row])
                this.rows[row] = tile.height;
            tile.height = this.rows[row];
            tile.draw();
            cursor[0] += this.columns[column++] * this.render.getNativeSize()[0];
            if (column >= this.columns.length) {
                column = 0;
                cursor[0] = 0;
                cursor[1] += this.rows[row++] * this.render.getNativeSize()[1];
            }
        }
        this.width = this.columns.reduce((c,v) => c + v, 0);
        this.height = this.rows.reduce((c,v) => c + v, 0);
        // grids end up with absolute widths 
        super.draw(false);
    }
    _fromXMLLexes(lexes) {
        this.tiles = [];
        for (const lex of lexes) {
            const name = Object.keys(lex)[0];
            const children = Object.values(lex)[0];
            const attributes = lex[':@'] ?? {};
            switch (name) {
            // ignore
            case '#comment': break;
            case 'text':
            case '#text':
                this.tiles.push(new Text(this.render, children, null, null, null, null, attributes.id));
                break;
            case 'grid':
                const rows = (attributes.rows ?? '').split(/,\s*/g).map(Number);
                const columns = (attributes.columns ?? '').split(/,\s*/g).map(Number);
                const grid = new Grid(this.render, rows, columns, null, null, null, null, attributes.id);
                grid._fromXMLLexes(children);
                this.tiles.push(grid);
                break;
            case 'button':
                const button = new Button(this.render, '', null, null, null, null, attributes.id);
                button._fromXMLLexes(children);
                this.tiles.push(button);
                break;
            }
        }
    }
}
class Text extends Tile {
    text = '';
    constructor(render, text, x,y, width, height, id) {
        super(render, x,y, width, height, id);
        this.text = text || '';
    }
    getByID(id) {
        if (this.id === id) return this;
        return this.tiles.find(tile => tile.id === id);
    }
    wrapText(text) {
        const lines = [''];
        // get the height of a text line 
        const measures = this.ctx.measureText(text);
        const height = measures.actualBoundingBoxDescent - measures.actualBoundingBoxAscent;
        const maxSize = new Point(0,height);
        for (let i = 0; i < text.length; i++) {
            if (text[i] === '\n') {
                maxSize[1] += height;
                lines.push('');
                break;
            }
            const next = lines[lines.length -1] + text[i];
            const measures = this.ctx.measureText(next);
            const width = measures.actualBoundingBoxRight - measures.actualBoundingBoxLeft;
            if (width > this.width) {
                maxSize[1] += height;
                lines.push(text[i]);
                continue;
            }
            maxSize.max([width, 0]);
            lines[lines.length -1] = next;
        }
        return [lines, height, maxSize];
    }
    draw() {
        if (!this.text) return;
        if (!this.ctx) return;
        this.ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.textBaseline = 'top';
        this.ctx.textAlign = 'left';
        const measures = this.ctx.measureText(this.text);
        // if width isnt defined, set it to the line width so we dont wrap
        this.width ||= measures.actualBoundingBoxRight - measures.actualBoundingBoxLeft;
        const [lines, lineHeight, size] = this.wrapText(this.text);
        // clamp size down to what we will actually draw
        this.canvas.width = this.width = size[0];
        this.canvas.height = this.height = size[1];
        let y = 0;
        for (const line of lines) {
            this.ctx.strokeText(line, 0,y);
            this.ctx.fillText(line, 0,y);
            y += lineHeight;
        }
        super.draw();
    }
}
class Button extends Tile {
    text = '';
    constructor(render, text, x,y, width, height, id) {
        super(render, x,y, width, height, id);
        this.text = text || '';
    }
    draw() {
        if (!this.text) return;
        if (!this.ctx) return;
        this.ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.textBaseline = 'top';
        this.ctx.textAlign = 'left';
        const measures = this.ctx.measureText(this.text);
        this.width = this.canvas.width = Math.max((measures.actualBoundingBoxRight - measures.actualBoundingBoxLeft) + 5, this.width || 0);
        this.height = this.canvas.height = Math.max((measures.actualBoundingBoxDescent - measures.actualBoundingBoxAscent) + 5, this.height || 0);
        this.ctx.strokeText(this.text, 2.5,2.5);
        this.ctx.fillText(this.text, 2.5,2.5);
        this.ctx.beginPath();
        this.ctx.moveTo(0,0);
        this.ctx.lineTo(this.width, 0);
        this.ctx.lineTo(this.width, this.height);
        this.ctx.lineTo(0, this.height);
        this.ctx.closePath();
        super.draw();
    }
    _fromXMLLexes(lexes) {
        // for now, just grab all text elements and nothing else
        const text = lexes => lexes
            .map(lex => typeof lex['#text'] === 'string' 
                ? lex['#text'] 
                : text(Object.values(lex))[0])
            .join(' ');
        this.text = text(lexes);
    }
}

module.exports = { InputScreen, Text, Button, Grid, Tile }