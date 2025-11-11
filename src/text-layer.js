const Point = require('./point');
const twgl = require('twgl.js');

class TextLayer {
    static tiles = Object.fromEntries(new Array(256).fill(-1)
        .map((_,i) => [String.fromCharCode(i), i]));
    static ansiEscapeMatch = /\x1b\[(?<op>[a-z]+) (?:(?<args>(?:[0-9.]*|#[0-9a-f]{3}|#[0-9a-f]{4}|#[0-9a-f]{6}|#[0-9a-f]{8})(?:;(?:[0-9]*|#[0-9a-f]{3}|#[0-9a-f]{4}|#[0-9a-f]{6}|#[0-9a-f]{8}))*) )?/gi;
    static tileSize = new Point(6,6);
    static scrollBufferLength = 2048;
    static layer = 'gui';
    static colorNumberToGL(color) {
        const r = ((color >> 16) & 0xFF) / 255;
        const g = ((color >> 8) & 0xFF) / 255;
        const b = (color & 0xFF) / 255;
        const a = ((color >> 24) & 0xFF) / 255;
        return [r, g, b, a];
    }
    static parseColor(v) {
        if (typeof v === 'string' && v[0] === '#') {
            switch (v.length) {
            case 4:
                return parseInt(v[3] + v[3], 16) +
                    (parseInt(v[2] + v[2], 16) << 8) +
                    (parseInt(v[1] + v[1], 16) << 16) + 
                    0xFF000000;
            case 5:
                return parseInt(v[3] + v[3], 16) +
                    (parseInt(v[2] + v[2], 16) << 8) +
                    (parseInt(v[1] + v[1], 16) << 16) + 
                    (parseInt(v[4] + v[4], 16) << 24);
            case 7:
                return parseInt(v[5] + v[6], 16) +
                    (parseInt(v[3] + v[4], 16) << 8) +
                    (parseInt(v[1] + v[2], 16) << 16) + 
                    0xFF000000;
            case 9:
                return parseInt(v[5] + v[6], 16) +
                    (parseInt(v[3] + v[4], 16) << 8) +
                    (parseInt(v[1] + v[2], 16) << 16) + 
                    (parseInt(v[7] + v[8], 16) << 24);
            }
        }
        if (typeof v === 'string' && v.slice(0,3) === 'rgb') {
            const args = v.slice(4, -1).split(/,\s*/i).map(Number);
            return Math.min(Math.round(args[2]), 255) + (Math.min(Math.round(args[1]), 255) << 8) + (Math.min(Math.round(args[0]), 255) << 16) + 0xFF000000;
        }
        return v;
    }

    cursor = new Point(0,0);
    size = new Point(0,0);
    /** @type {import('./renderer/src/RenderWebGL')} */
    render = null;
    pen = {
        /** @type {number} */
        draw: null,
        /** @type {number} */
        skin: null,
        /** @type {number} */
        alt: null
    };
    /** @type {number} */
    stamp = null;
    skins = {};
    /** @type {import('glfw-raub').Window} */
    window = null;
    needsFlush = false;
    _fill = 0x00000000;
    _stroke = 0xFFFFFFFF;
    strokeWidth = 1;
    tabLength = 7;
    scrollOff = 0;
    /** @type {twgl.FrameBufferInfo} */
    scrollBufferUp = null;
    /** @type {twgl.FrameBufferInfo} */
    scrollBufferDown = null;
    constructor(window, render) {
        this.window = window;
        this.render = render;
        this.resizeViewport(window.width, window.height);
        this.pen.draw = this.render.createDrawable(TextLayer.layer);
        this.pen.skin = this.render.createPenSkin();
        this.pen.alt = this.render.createPenSkin();
        this.render.updateDrawableSkinId(this.pen.draw, this.pen.skin);
        this.stamp = this.render.createDrawable(TextLayer.layer);
        this.render.updateDrawableVisible(this.stamp, false);
        window.on('mousewheel', ({ deltaY }) => this.scroll(-deltaY / TextLayer.tileSize[1] / TextLayer.tileSize[0]));
        this.text(new Array(this.size[0]).fill('q').join(''), new Point(0, this.size[1] -1));
    }
    set fill(v) {
        this._fill = TextLayer.parseColor(v) || 0;
    }
    get fill () { return this._fill; }
    set stroke(v) {
        this._stroke = TextLayer.parseColor(v) || 0;
    }
    get stroke () { return this._stroke; }
    resizeViewport(width, height) {
        this.size.set(width, height);
        this.size.div(TextLayer.tileSize)
            .clamp(1);
        const gl = this.render.gl;
        this.scrollBufferUp = twgl.createFramebufferInfo(gl, [{ format: gl.RGBA }], width, TextLayer.scrollBufferLength);
        this.scrollBufferDown = twgl.createFramebufferInfo(gl, [{ format: gl.RGBA }], width, TextLayer.scrollBufferLength);
    }
    loadAssets(assets) {
        for (let i = 0; i < 256; i++)
            this.skins[String.fromCharCode(i)] = this.render.createBitmapSkin(assets.get(`char-${i}`), 1, [0,0]);
        this.skins['rectangle'] = this.render.createRectangleSkin([0,0]);
        this.skins['elipse'] = this.render.createElipseSkin([0,0]);
    }
    moveTo(x,y) { this.cursor.set(x,y); }
    lineTo(x,y) {
        this.line(this.cursor[0], this.cursor[1], x,y);
        this.cursor.set(x,y);
    }
    clearAll() {
        this.render.penClear(this.pen.skin);
    }
    clearArea(x,y, width, height) {
        const pos = new Point(x,y).sub(this.size.clone().div(2).sub([0,1]).translate(0,-height)).mul(TextLayer.tileSize);
        this.render.penClearRect(this.pen.skin, Math.floor(pos[0]), Math.floor(pos[1]), Math.ceil(width * TextLayer.tileSize[0]), Math.ceil(height * TextLayer.tileSize[1]));
    }
    clearLine(line) {
        const pos = new Point(0, line).sub(this.size.clone().div(2).sub([0,1])).mul(TextLayer.tileSize);
        this.render.penClearRect(this.pen.skin, 0, Math.floor(pos[1]), this.size[0] * TextLayer.tileSize[0], TextLayer.tileSize[1]);
    }
    dot(x,y) {
        this.render.penPoint(this.pen.skin, {
            diameter: this.strokeWidth,
            color4f: TextLayer.colorNumberToGL(this._stroke)
        }, (x - (this.size[0] / 2)) * TextLayer.tileSize[0], (y - ((this.size[1] / 2) -1)) * TextLayer.tileSize[1]);
    }
    line(sx,sy,ex,ey) {
        this.render.penLine(this.pen.skin, {
            diameter: this.strokeWidth,
            color4f: TextLayer.colorNumberToGL(this._stroke)
        }, (sx - (this.size[0] / 2)) * TextLayer.tileSize[0], (sy - ((this.size[1] / 2) -1)) * TextLayer.tileSize[1], (ex - (this.size[0] / 2)) * TextLayer.tileSize[0], (ey - (this.size[1] / 2)) * TextLayer.tileSize[1]);
    }
    rect(x,y, width, height) {
        this.render.updateDrawableSkinId(this.stamp, this.skins['rectangle']);
        this.render.updateDrawableEffect(this.stamp, 'horizontalShear', 0);
        this.render.updateDrawableEffect(this.stamp, 'tintWhites', 0);
        this.render.updateDrawableEffect(this.stamp, 'tintBlacks', 0);
        this.render.updateDrawablePosition(this.stamp, [(x - (this.size[0] / 2)) * TextLayer.tileSize[0], (height + (y - ((this.size[1] / 2) -1))) * TextLayer.tileSize[1]]);
        this.render.updateRectangleSkin(this.skins['rectangle'], [width * TextLayer.tileSize[0], height * TextLayer.tileSize[1]], TextLayer.colorNumberToGL(this._fill), TextLayer.colorNumberToGL(this._stroke), this.strokeWidth, [0,0]);
        this.render.penStamp(this.pen.skin, this.stamp);
    }
    elipse(x,y, radiusX, radiusY, start = 0, end = 360) {
        this.render.updateElipseSkin(this.skins['elipse'], [radiusX * TextLayer.tileSize[0], radiusY * TextLayer.tileSize[1]], TextLayer.colorNumberToGL(this._fill), [0,0], start, end, TextLayer.colorNumberToGL(this._stroke), this.strokeWidth, [0,0]);
        this.render.updateDrawableSkinId(this.stamp, this.skins['elipse']);
        this.render.updateDrawableEffect(this.stamp, 'horizontalShear', 0);
        this.render.updateDrawableEffect(this.stamp, 'tintWhites', 0);
        this.render.updateDrawableEffect(this.stamp, 'tintBlacks', 0);
        this.render.updateDrawablePosition(this.stamp, [(x - (this.size[0] / 2)) * TextLayer.tileSize[0], ((y + height) - ((this.size[1] / 2) -1)) * TextLayer.tileSize[1]]);
        this.render.penStamp(this.pen.skin, this.stamp);
    }
    text(str, pos) {
        let foreColor = this._stroke;
        let italic = false;
        let backColor = this._fill;
        let last = 0;
        const cursor = (pos ?? this.cursor).clone().max(0).min(this.size.clone().sub(1));
        pos ??= new Point(0,0);
        const tiles = [];
        for (const match of str.matchAll(TextLayer.ansiEscapeMatch)) {
            const args = (match.groups.args ?? '')
                .split(';')
                .map(arg => {
                    if (arg[0] === '#') return arg;
                    if (arg.length === 0) return null;
                    if (Number(arg) === NaN) return 0;
                    return Number(arg);
                });
            const text = str.slice(last, match.index);
            for (const char of text) {
                if (cursor[0] >= this.size[0]) {
                    cursor[0] = pos[0];
                    cursor[1]++;
                }
                if (char === '\n') {
                    cursor[0] = pos[0];
                    cursor[1]++;
                    continue;
                }
                if (char === '\t') {
                    cursor[0] = Math.ceil(cursor[0] / this.tabLength) * this.tabLength;
                    continue;
                }
                tiles.push([char, foreColor, backColor, italic, cursor.clone()]);
                cursor[0]++;
            }
            switch (match.groups.op) {
            case 'move': cursor.set(args[0], args[1]); break;
            case 'foreColor': foreColor = TextLayer.parseColor(args[0]); break;
            case 'backColor': backColor = TextLayer.parseColor(args[0]); break;
            case 'italic': italic = args[0] ?? true; break;
            case 'clearLine': this.clearLine(cursor[1]); break;
            case 'clearArea': this.clearArea(cursor[0], cursor[1], args[0], args[1]); break;
            case 'clear': this.clearAll(); break;
            case 'reset':
                foreColor = this._stroke;
                backColor = this._fill;
                italic = false;
                break;
            }
            last = match.index + match[0].length;
        }
        const text = str.slice(last);
        for (const char of text) {
            if (cursor[0] >= this.size[0]) {
                cursor[0] = pos[0];
                cursor[1]++;
            }
            if (char === '\n') {
                cursor[0] = pos[0];
                cursor[1]++;
                continue;
            }
            if (char === '\t') {
                cursor[0] = Math.ceil(cursor[0] / this.tabLength) * this.tabLength;
                continue;
            }
            tiles.push([char, foreColor, backColor, italic, cursor.clone()]);
            cursor[0]++;
        }
        this._stroke = foreColor;
        this._fill = backColor;
        this.cursor.set(cursor);
        this.putSection(tiles);
    }
    putSection(tiles) {
        for (let i = tiles.length -1; i >= 0; i-- ) {
            const pos = tiles[i][4]
                .max(0)
                .min(this.size.clone().sub(1))
                .clone()
                .sub(this.size.clone().div(2).sub([0,1]))
                .mul(TextLayer.tileSize)
                .clamp(1);
            if (tiles[i][4][1] < 0) continue;
            this.render.penClearRect(this.pen.skin, pos[0], pos[1], TextLayer.tileSize[0], TextLayer.tileSize[0]);
            this.render.updateDrawableSkinId(this.stamp, this.skins[tiles[i][0]]);
            this.render.updateDrawableEffect(this.stamp, 'horizontalShear', tiles[i][3] ? 2 : 0);
            this.render.updateDrawableEffect(this.stamp, 'tintWhites', tiles[i][1] +1);
            this.render.updateDrawableEffect(this.stamp, 'tintBlacks', tiles[i][2] +1);
            this.render.updateDrawablePosition(this.stamp, pos);
            this.render.penStamp(this.pen.skin, this.stamp);
        }
    }
    /**
     * Puts one frame buffer overtop another 
     * @param {Point} pos 
     * @param {twgl.FrameBufferInfo} source Location to get pixels from
     * @param {twgl.FrameBufferInfo} destination Location to put pixels in
     */
    _frameOverFrame(pos, source, destination) {
        const gl = this.render.gl;
        pos = pos.clone().mul(TextLayer.tileSize);
        twgl.bindFramebufferInfo(gl, source, gl.READ_FRAMEBUFFER);
        twgl.bindFramebufferInfo(gl, destination, gl.DRAW_FRAMEBUFFER);
        gl.blitFramebuffer(
            // from xy xy
            Math.max(-pos[0], 0), Math.max(-pos[1], 0), Math.min(source.width - pos[0], source.width), Math.min(source.height - pos[1], source.height),
            // to xy xy
            Math.max(pos[0], 0), Math.max(pos[1], 0), Math.min(source.width + pos[0], source.width), Math.min(source.height + pos[1], source.height),
            // buffer and resampling filter
            gl.COLOR_BUFFER_BIT, gl.LINEAR
        );
    }
    scroll(distance = 1) {
        distance = Math.round(distance);
        // nowhere to scroll
        if (distance === 0) return;
        // stamping one pen skin to another causes strange artifacting, instead we manually blit one onto the other
        const source = this.render._allSkins[this.pen.skin];
        const destination = this.render._allSkins[this.pen.alt];
        const gl = this.render.gl;
        twgl.bindFramebufferInfo(gl, destination._framebuffer, gl.DRAW_FRAMEBUFFER);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        const scrollPos = new Point(0, distance);
        this._frameOverFrame(scrollPos, source._framebuffer, destination._framebuffer);
        // copy for display
        // copy for scroll buffer, in the necessary direction
        if (distance >= 1) {
            this._frameOverFrame(scrollPos.add([0,-this.size[1]]), source._framebuffer, this.scrollBufferUp);
            this._frameOverFrame(scrollPos.add([0,-TextLayer.scrollBufferLength]).mul(-1), this.scrollBufferDown, destination._framebuffer);
        } else {
            this._frameOverFrame(scrollPos.add([0,this.size[1]]), source._framebuffer, this.scrollBufferUp);
            this._frameOverFrame(scrollPos.add([0,TextLayer.scrollBufferLength]).mul(-1), this.scrollBufferUp, destination._framebuffer);
        }
        this.pen.alt = source.id;
        this.pen.skin = destination.id;
        this.render.updateDrawableSkinId(this.pen.skin);
    }
}

module.exports = TextLayer;