const Point = require('./point');
const twgl = require('twgl.js');
const { Image: SVGImage } = require('canvas');
const BitmapImage = require('image-raub');
const fs = require('fs/promises');

class TextLayer {
    static tiles = Object.fromEntries(new Array(256).fill(-1)
        .map((_,i) => [String.fromCharCode(i), i]));
    static ansiEscapeMatch = /\x1b\[(?<op>[a-z]+) (?:(?<args>(?:[0-9.]*|#[0-9a-f]{3}|#[0-9a-f]{4}|#[0-9a-f]{6}|#[0-9a-f]{8})(?:;(?:[0-9]*|#[0-9a-f]{3}|#[0-9a-f]{4}|#[0-9a-f]{6}|#[0-9a-f]{8}))*) )?/gi;
    static scaled = 100;
    static tileSize = new Point(TextLayer.scaled * 6,TextLayer.scaled * 6);
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
    _fill = 0x00000000;
    _stroke = 0xFFFFFFFF;
    strokeWidth = 1;
    italic = false;
    tabLength = 7;
    textScale = 1;
    /** @type {'left'|'right'|'center'} */
    xAlign = 'left';
    /** @type {'top'|'center'|'bottom'} */
    yAlign = 'top';
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
        this.scrollBufferSwap = twgl.createFramebufferInfo(gl, [{ format: gl.RGBA }], width, TextLayer.scrollBufferLength);
    }
    loadAssets(assets) {
        for (let i = 0; i < 256; i++)
            this.skins[String.fromCharCode(i)] = this.render.createBitmapSkin(assets.get(`char-${i}`), 1, [0,0]);
        this.skins['rectangle'] = this.render.createRectangleSkin([0,0]);
        this.skins['elipse'] = this.render.createElipseSkin([0,0]);
        this.skins['bitmap'] = this.render.createBitmapSkin(BitmapImage.fromPixels(1,1,1, Buffer.from([1])), [0,0]);
        this.skins['svg'] = this.render.createSVGSkin('data:image/svg+xml;utf8,<svg></svg>', [0,0]);
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
            diameter: this.strokeWidth * TextLayer.scaled,
            color4f: TextLayer.colorNumberToGL(this._stroke)
        }, (x - (this.size[0] / 2)) * TextLayer.tileSize[0], (y - ((this.size[1] / 2) -1)) * TextLayer.tileSize[1]);
    }
    line(sx,sy,ex,ey) {
        this.render.penLine(this.pen.skin, {
            diameter: this.strokeWidth * TextLayer.scaled,
            color4f: TextLayer.colorNumberToGL(this._stroke)
        }, (sx - (this.size[0] / 2)) * TextLayer.tileSize[0], (sy - ((this.size[1] / 2) -1)) * TextLayer.tileSize[1], (ex - (this.size[0] / 2)) * TextLayer.tileSize[0], (ey - (this.size[1] / 2)) * TextLayer.tileSize[1]);
    }
    rect(x,y, width, height) {
        this.render.updateDrawableSkinId(this.stamp, this.skins['rectangle']);
        this.render.updateDrawableEffect(this.stamp, 'horizontalShear', 0);
        this.render.updateDrawableEffect(this.stamp, 'tintWhites', 0);
        this.render.updateDrawableEffect(this.stamp, 'tintBlacks', 0);
        const size = new Point(width,height).mul(TextLayer.tileSize);
        const pos = new Point(x,y)
            .sub(this.size.clone().div(2).translate(0,-1))
            .mul(TextLayer.tileSize);
        switch (this.xAlign) {
        case 'left': break;
        case 'center': pos[0] += size[0] / 2; break;
        case 'right': pos[0] += size[0]; break;
        }
        switch (this.yAlign) {
        case 'top': pos[1] += size[1]; break;
        case 'center': pos[1] += size[1] / 2; break;
        case 'bottom': break;
        }
        this.render.updateDrawablePosition(this.stamp, pos);
        this.render.updateDrawableScale(this.stamp, [100,100]);
        this.render.updateRectangleSkin(this.skins['rectangle'], size, TextLayer.colorNumberToGL(this._fill), TextLayer.colorNumberToGL(this._stroke), this.strokeWidth * TextLayer.scaled, [0,0]);
        this.render.penStamp(this.pen.skin, this.stamp);
    }
    elipse(x,y, radiusX, radiusY, start = 0, end = 360) {
        this.render.updateDrawableSkinId(this.stamp, this.skins['elipse']);
        this.render.updateDrawableEffect(this.stamp, 'horizontalShear', 0);
        this.render.updateDrawableEffect(this.stamp, 'tintWhites', 0);
        this.render.updateDrawableEffect(this.stamp, 'tintBlacks', 0);
        const radi = new Point(radiusX,radiusY).mul(TextLayer.tileSize);
        const pos = new Point(x,y)
            .sub(this.size.clone().div(2).translate(0,-1))
            .mul(TextLayer.tileSize);
        switch (this.xAlign) {
        case 'left': break;
        case 'center': pos[0] += radi[0] / 2; break;
        case 'right': pos[0] += radi[0]; break;
        }
        switch (this.yAlign) {
        case 'top': pos[1] += radi[1]; break;
        case 'center': pos[1] += radi[1] / 2; break;
        case 'bottom': break;
        }
        this.render.updateDrawablePosition(this.stamp, pos);
        this.render.updateDrawableScale(this.stamp, [100,100]);
        this.render.updateElipseSkin(this.skins['elipse'], radi, TextLayer.colorNumberToGL(this._fill), [0,0], start, end, TextLayer.colorNumberToGL(this._stroke), this.strokeWidth * TextLayer.scaled, [0,0]);
        this.render.penStamp(this.pen.skin, this.stamp);
    }
    async image(image, x,y, width,height) {
        if (typeof image === 'string') {
            // external url or blob, pass to fetch to resolve
            if (/$(https?|data|blob):/i.test(image)) {
                const req = await fetch(image);
                if (!req.ok) return console.error(`${image} could not be loaded`);
                const res = Buffer.from(await req.bytes());
                if (req.headers.get('content-type') === 'image/svg+xml') image = res.toString('utf8');
                else await new Promise(resolve => {
                    // image-raub has wider type support, and the only reason we even care
                    // here is due to vectors not being supported and needing special care
                    const img = new BitmapImage();
                    img.onerror = (...args) => console.error('bad image url', image, 'error:', ...args);
                    img.onload = () => resolve(image = img);
                    img.src = res;
                });
            }
            // its not a raw SVG, so it must be a local file handle
            if (!image.includes('<svg')) {
                const res = await fs.readFile(image);
                if (req.headers.get('content-type') === 'image/svg+xml') image = res.toString('utf8');
                else await new Promise(resolve => {
                    // image-raub has wider type support, and the only reason we even care
                    // here is due to vectors not being supported and needing special care
                    const img = new BitmapImage();
                    img.onerror = (...args) => console.error('bad image url', image, 'error:', ...args);
                    img.onload = () => resolve(image = img);
                    img.src = res;
                });
            }
        }
        if (image instanceof Buffer) {
            // may be an SVG?
            if (image.toString('utf8').includes('<svg')) image = res.toString('utf8');
            // alas, it was not
            else await new Promise(resolve => {
                // image-raub has wider type support, and the only reason we even care
                // here is due to vectors not being supported and needing special care
                const img = new BitmapImage();
                img.onerror = (...args) => console.error('bad image url', image, 'error:', ...args);
                img.onload = () => resolve(image = img);
                img.src = image;
            });

        }
        if ((image instanceof SVGImage && /<svg|image\/svg+xml|.svg^/i.test(image.src)) ||
            (typeof image === 'string' && image.includes('<svg'))) {
            this.render.updateSVGSkin(this.skins['svg'], image.src, [0,0]);
            this.render.updateDrawableSkinId(this.stamp, this.skins['svg']);
        } else {
            this.render.updateBitmapSkin(this.skins['bitmap'], image, 1, [0,0]);
            this.render.updateDrawableSkinId(this.stamp, this.skins['bitmap']);
        }
        this.render.updateDrawableSkinId(this.stamp, this.skins['rectangle']);
        this.render.updateDrawableEffect(this.stamp, 'horizontalShear', 0);
        this.render.updateDrawableEffect(this.stamp, 'tintWhites', 0);
        this.render.updateDrawableEffect(this.stamp, 'tintBlacks', 0);
        const size = new Point(width,height).mul(TextLayer.tileSize);
        const pos = new Point(x,y)
            .sub(this.size.clone().div(2).translate(0,-1))
            .mul(TextLayer.tileSize);
        switch (this.xAlign) {
        case 'left': break;
        case 'center': pos[0] += size[0] / 2; break;
        case 'right': pos[0] += size[0]; break;
        }
        switch (this.yAlign) {
        case 'top': pos[1] += size[1]; break;
        case 'center': pos[1] += size[1] / 2; break;
        case 'bottom': break;
        }
        this.render.updateDrawablePosition(this.stamp, pos);
        this.render.updateDrawableScale(this.stamp, [100,100]);
        this.render.penStamp(this.pen.skin, this.stamp);
    }
    text(str, pos) {
        pos ??= this.cursor;
        this.cursor = pos.clone();
        const lines = [[]];
        let funcName = '';
        let args = [''];
        let totalWidth = 0;
        /**
         * 0: Initial state, all none special characters go into lines
         * 1: A $ has been spotted while in state 0, all characters go into funcName
         * 2: A ( has been spotted while in state 1, all characters go into args until a )
         * @type {0|1|2}
         */
        let state = 0;
        for (let i = 0, char; char = str[i]; i++) {
            totalWidth = Math.max(totalWidth, lines.at(-1).length);
            switch (state) {
            case 0:
                switch (char) {
                case '$': state = 1; break;
                case '\t':
                    this.cursor[0] = Math.ceil(this.cursor[0] / this.tabLength) * this.tabLength;
                    break;
                case '\n':
                    this.cursor[0] = pos[0];
                    this.cursor[1]++;
                    break;
                default:
                    lines.at(-1).push([char, this._stroke, this._fill, this.italic, this.textScale, this.cursor.clone()]);
                    this.cursor[0]++;
                    break;
                }
                break;
            case 1:
                switch (char) {
                case '(': state = 2; break;
                case '$':
                    if (char === '$' && funcName === '') {
                        lines.at(-1).push([char, this._stroke, this._fill, this.italic, this.textScale, this.cursor.clone()]);
                        this.cursor[0]++;
                        state = 0;
                        break;
                    }
                default: funcName += char; break;
                }
                break;
            case 2:
                switch (char) {
                case ')': {
                    state = 0;
                    funcName = funcName.trim();
                    args = args.map(arg => isNaN(Number(arg.trim())) ? arg.trim() : Number(arg.trim()));
                    switch (funcName) {
                    case 'move': this.cursor.set(args[0], args[1]); break;
                    case 'reset': 
                        this.italic = false;
                        this.stroke = '#FFFF';
                        this.fill = '#0000';
                        break;
                    case 'fill': this.fill = args[0]; break;
                    case 'stroke': this.stroke = args[0]; break;
                    case 'italic': this.italic = args[0] || true; break;
                    case 'clearLine': this.clearLine(args[0] || this.cursor[1]); break;
                    case 'clearArea': this.clearArea(args[2] ?? this.cursor[0], args[3] ?? this.cursor[1], args[0], args[1]); break;
                    case 'clearAll': this.clearAll(); break;
                    case 'scale': this.textScale = args[0]; break;
                    }
                    funcName = '';
                    args = [''];
                    break;
                }
                case ',': args.push(''); break;
                default: args[args.length -1] += char; break;
                }
                break;
            }
        }
        const tiles = [];
        for (const line of lines) {
            for (const tile of line) {
                const pos = tile.pop();
                switch (this.xAlign) {
                case 'left': break;
                case 'center': pos[0] += (totalWidth - line.length) / 2; break;
                case 'right': pos[0] += totalWidth - line.length; break;
                }
                switch (this.yAlign) {
                case 'top': break;
                case 'center': pos[1] += (lines.length / 2) - 0.5; break;
                case 'bottom': pos[1] += lines.length; break;
                }
                tile.push(pos);
                tiles.push(tile);
            }
        }
        this.putSection(tiles);
    }
    /**
     * 
     * @param {[string, number, number, boolean, number, Point][]} tiles 
     */
    putSection(tiles) {
        for (let i = tiles.length -1; i >= 0; i-- ) {
            const pos = tiles[i].at(-1)
                .max(0)
                .min(this.size.clone().sub(1))
                .clone()
                .sub(this.size.clone().div(2).sub([0,1]))
                .mul(TextLayer.tileSize)
                .clamp(1);
            this.render.penClearRect(this.pen.skin, pos[0], pos[1], TextLayer.tileSize[0], TextLayer.tileSize[0]);
            this.render.updateDrawableSkinId(this.stamp, this.skins[tiles[i][0]]);
            this.render.updateDrawableEffect(this.stamp, 'horizontalShear', tiles[i][3] ? 2 : 0);
            this.render.updateDrawableEffect(this.stamp, 'tintWhites', tiles[i][1] +1);
            this.render.updateDrawableEffect(this.stamp, 'tintBlacks', tiles[i][2] +1);
            this.render.updateDrawablePosition(this.stamp, pos);
            this.render.updateDrawableScale(this.stamp, [(tiles[i][4] * TextLayer.scaled) * 100, (tiles[i][4] * TextLayer.scaled) * 100]);
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
        const swap = this.scrollBufferSwap;
        // copy for display
        // copy for scroll buffer, in the necessary direction
        if (distance >= 1) {
            this._frameOverFrame(scrollPos, this.scrollBufferUp, swap);
            this._frameOverFrame(scrollPos.add([0,-this.size[1]]), source._framebuffer, swap);
            this.scrollBufferSwap = this.scrollBufferUp;
            this.scrollBufferUp = swap;
            this._frameOverFrame(scrollPos.add([0,-TextLayer.scrollBufferLength]).mul(-1), this.scrollBufferDown, destination._framebuffer);
        } else {
            this._frameOverFrame(scrollPos, this.scrollBufferDown, swap);
            this._frameOverFrame(scrollPos.add([0,this.size[1]]), source._framebuffer, swap);
            this.scrollBufferSwap = this.scrollBufferDown;
            this.scrollBufferDown = swap;
            this._frameOverFrame(scrollPos.add([0,TextLayer.scrollBufferLength]), this.scrollBufferUp, destination._framebuffer);
        }
        this.pen.alt = source.id;
        this.pen.skin = destination.id;
        this.render.updateDrawableSkinId(this.pen.skin);
    }
}

module.exports = TextLayer;