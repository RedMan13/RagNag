const TileSpace = require('./tile-drawing');
const Point = require('./point');

class TextLayer {
    static tiles = Object.fromEntries(new Array(256).fill(-1)
        .map((_,i) => [String.fromCharCode(i), i]));
    static ansiEscapeMatch = /\x1b\[(?<op>[a-z]+)\s+(?<args>(?:[0-9]*|#[0-9a-f]{3}|#[0-9a-f]{4}|#[0-9a-f]{6}|#[0-9a-f]{8})(?:;\s*(?:[0-9]*|#[0-9a-f]{3}|#[0-9a-f]{4}|#[0-9a-f]{6}|#[0-9a-f]{8})*))/gi;
    static tileSize = new Point(6,6);
    static layer = 'gui';

    camera = {
        scale: 2,
        pos: new Point(0,0),
        dir: 0
    }
    cursor = new Point(0,0);
    /** @type {[string, number, number, boolean][][]} */
    map = null;
    size = new Point(0,0);
    /** @type {import('./renderer/src/RenderWebGL')} */
    render = null;
    pen = {
        /** @type {number} */
        draw: null,
        /** @type {number} */
        skin: null
    };
    /** @type {number} */
    stamp = null;
    skins = {};
    /** @type {import('glfw-raub').Window} */
    window = null;
    needsFlush = false;
    constructor(window, render) {
        this.resizeViewport(window.width, window.height);
        this.window = window;
        this.render = render;
        this.pen.draw = this.render.createDrawable(TextLayer.layer);
        this.pen.skin = this.render.createPenSkin();
        this.render.updateDrawableSkinId(this.pen.draw, this.pen.skin);
        this.stamp = this.render.createDrawable(TextLayer.layer);
        this.render.updateDrawableVisible(this.stamp, false);
    }
    resizeViewport(width, height) {
        this.size.set(width, height);
        this.size.div(TextLayer.tileSize)
            .clamp(1);
        this.map = new Array(this.size[0]).fill(0)
            .map(() => new Array(this.size[1]).fill(0)
                .map(() => [' ', 0xFFFFFFFF, 0x00000000, false]));
    }
    loadAssets(assets) {
        for (let i = 0; i < 256; i++)
            this.skins[String.fromCharCode(i)] = this.render.createBitmapSkin(assets.get(`char-${i}`), 1, [0,0]);
    }
    moveTo(x,y) { this.cursor.set(x,y); }
    text(str) {
        let foreColor = 0xFFFFFF;
        let italic = false;
        let backColor = 0x000000;
        let last = 0;
        const cursor = this.cursor.clone().max(0).min(this.size.clone().sub(1)).clamp(1);
        const tiles = [];
        for (const match of str.matchAll(TextLayer.ansiEscapeMatch)) {
            const args = match.groups.args
                .split(';')
                .map(arg => arg[0] === '#' ? parseInt(arg.slice(1), 16) : Number(arg) || 0);
            switch (match.groups.op) {
            case 'move': cursor.set(args[0], args[1]); break;
            case 'forecolor': foreColor = args[0]; break;
            case 'backbcolor': backColor = args[0]; break;
            case 'italic': italic = args[0] ?? true; break;
            }
            const text = str.slice(last, match.index);
            for (const char in text) {
                if (cursor[0] >= this.size[0]) {
                    cursor[0] = 0;
                    cursor[1]++;
                }
                tiles.push([char, foreColor, backColor, italic, cursor.clone()]);
                cursor[0]++;
            }
            last = match.index + match[0].length;
        }
        const text = str.slice(last);
        for (const char of text) {
            if (cursor[0] >= this.size[0]) {
                cursor[0] = 0;
                cursor[1]++;
            }
            tiles.push([char, foreColor, backColor, italic, cursor.clone()]);
            cursor[0]++;
        }
        this.cursor.set(cursor);
        this.putSection(tiles);
    }
    putSection(tiles) {
        for (let i = 0; i < tiles.length; i++ ) {
            if (!this.map[tiles[i][4][0]]?.[tiles[i][4][1]]) continue;
            const pos = tiles[i][4].clone().sub(this.size.clone().div(2).scale(-1,1)).mul(TextLayer.tileSize);
            // overwriting text requires a complete flush
            if (this.map[tiles[i][4][0]][tiles[i][4][1]][0] !== ' ' && this.map[tiles[i][4][0]][tiles[i][4][1]][0] !== tiles[i][0])
                this.render.penClearRect(this.pen.skin, pos[0], pos[1], TextLayer.tileSize[0], TextLayer.tileSize[0]);
            this.map[tiles[i][4][0]][tiles[i][4][1]] = tiles[i];
            if (tiles[i][0] === ' ') continue;
            this.render.updateDrawableSkinId(this.stamp, this.skins[tiles[i][0]]);
            this.render.updateDrawableEffect(this.stamp, 'horizontalShear', tiles[i][3] ? 17 : 0);
            this.render.updateDrawableEffect(this.stamp, 'tintWhites', tiles[i][1]);
            this.render.updateDrawableEffect(this.stamp, 'tintBlacks', tiles[i][2]);
            this.render.updateDrawablePosition(this.stamp, pos);
            this.render.penStamp(this.pen.skin, this.stamp);
        }
    }
}

module.exports = TextLayer;