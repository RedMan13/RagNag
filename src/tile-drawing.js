const Point = require('./point');
const { createCanvas } = require('canvas');

class TileSpace {
    static drawableLayer = 'tiles';
    static tiles = {
        none: 0,
        error: 1,
        topLeft: 2,
        topRight: 3,
        bottomLeft: 4,
        bottomRight: 5,
        left: 6,
        top: 7,
        right: 8,
        bottom: 9
    };
    static tileGeometry = {
        // note: all shapes must be concave, convex shapes cant be detected well arbitrarily
        [TileSpace.tiles.none]: [
            0,0,0,0,0,
            0,0,0,0,0,
            0,0,0,0,0,
            0,0,0,0,0,
            0,0,0,0,0
        ],
        [TileSpace.tiles.error]: [
            1,1,1,1,1,
            1,1,1,1,1,
            1,1,1,1,1,
            1,1,1,1,1,
            1,1,1,1,1
        ],
        [TileSpace.tiles.left]: [
            1,0,0,0,0,
            1,0,0,0,0,
            1,0,0,0,0,
            1,0,0,0,0,
            1,0,0,0,0
        ],
        [TileSpace.tiles.right]: [
            0,0,0,0,1,
            0,0,0,0,1,
            0,0,0,0,1,
            0,0,0,0,1,
            0,0,0,0,1
        ],
        [TileSpace.tiles.bottom]: [
            0,0,0,0,0,
            0,0,0,0,0,
            0,0,0,0,0,
            0,0,0,0,0,
            1,1,1,1,1
        ],
        [TileSpace.tiles.top]: [
            1,1,1,1,1,
            0,0,0,0,0,
            0,0,0,0,0,
            0,0,0,0,0,
            0,0,0,0,0
        ],
        [TileSpace.tiles.bottomLeft]: [
            1,0,0,0,0,
            1,0,0,0,0,
            1,0,0,0,0,
            1,0,0,0,0,
            1,1,1,1,1
        ],
        [TileSpace.tiles.bottomRight]: [
            0,0,0,0,1,
            0,0,0,0,1,
            0,0,0,0,1,
            0,0,0,0,1,
            1,1,1,1,1
        ],
        [TileSpace.tiles.topLeft]: [
            1,1,1,1,1,
            1,0,0,0,0,
            1,0,0,0,0,
            1,0,0,0,0,
            1,0,0,0,0
        ],
        [TileSpace.tiles.topRight]: [
            1,1,1,1,1,
            0,0,0,0,1,
            0,0,0,0,1,
            0,0,0,0,1,
            0,0,0,0,1
        ]
    }
    /** @type {{ [key: number]: number }} */
    skins = {};
    /** @type {import('glfw-raub').Window} */
    window = null;
    /** @type {import('./renderer/src/RenderWebGL')} */
    render = null;
    /** @type {{ type: number, displayPos: Point?, realPos: Point?, effects: { color: number?, fisheye: number?, whirl: number?, pixelate: number?, mosaic: number?, brightness: number?, ghost: number?, red: number?, green: number?, blue: number?, opaque: number?, saturation: number?, tintColor: number?, repeatX: number?, repeatY: number? }}[][]} */
    map = [];
    /** @type {Point} */
    wh = new Point(0,0);
    /** @type {number[]} */
    drawables = [];
    /** @type {Point} */
    screenWh = new Point(0,0);
    /** @type {Point} */
    tileWh = new Point(0,0);
    camera = {
        scale: 1,
        /** @type {Point} */
        pos: new Point(0,0),
        /** @type {number} */
        dir: 90
    };
    debug = {
        enabled: false,
        /** @type {import('canvas').Canvas} */
        canvas: null,
        /** @type {import('canvas').CanvasRenderingContext2D} */
        ctx: null,
        /** @type {{ [key: number]: number }} */
        oldSkins: {}
    };
    /**
     * @param {import('webgl-raub').Window} window 
     * @param {import('./renderer/src/RenderWebGL')} render 
     * @param {number} tileWidth 
     * @param {number} tileHeight 
     * @param {number} width 
     * @param {number} height 
     */
    constructor(window, render, tileWidth, tileHeight, width, height, wrap = false) {
        this.window = window;
        this.render = render;
        this.wh = new Point(width, height);
        this.tileWh = new Point(tileWidth, tileHeight);
        this.wrap = wrap;
        this.resizeViewport(window.width, window.height);
        this.resizeWorld(width, height);
    }
    /**
     * Enables collision geometry debugging
     */
    enableDebug() {
        this.debug.enabled = true;
        this.debug.canvas = createCanvas(20,20);
        this.debug.ctx = this.debug.canvas.getContext('2d');
        this.debug.oldSkins = this.skins;
        this.debug.ctx.fillStyle = 'red';
        this.debug.ctx.scale(4,4);
        this.skins = {};
        for (const type in TileSpace.tileGeometry) {
            if (!TileSpace.tileGeometry[type]?.length) continue;
            this.debug.ctx.clearRect(0,0, 20,20);
            for (const idx in TileSpace.tileGeometry[type])
                if (TileSpace.tileGeometry[type][idx])
                    this.debug.ctx.fillRect(idx % 5, Math.floor(idx / 5), 1,1);
            this.skins[type] = this.render.createBitmapSkin(this.debug.canvas, 1);
        }
    }
    /**
     * Resize the map thats used to make the world space
     * @param {number} width 
     * @param {number} height 
     */
    resizeWorld(width, height) {
        this.wh = new Point(width, height);
        let i = 0;
        this.map = new Array(this.wh[0]).fill([])
            .map((_, x) => 
                new Array(this.wh[1]).fill([])
                    .map((_, y) => {
                        // return [TileSpace.tiles.error];
                        const left = x === 0;
                        const right = x === (this.wh[0] -1);
                        const top = y === (this.wh[1] -1)
                        const bottom = y === 0;
                        // if ( top &&                       left) return [TileSpace.tiles.topLeft];
                        // if ( top &&            !right && !left) return [TileSpace.tiles.top];
                        // if ( top &&             right         ) return [TileSpace.tiles.topRight];
                        if (!top && !bottom &&  right         ) return { type: TileSpace.tiles.right };
                        if (         bottom &&  right         ) return { type: TileSpace.tiles.bottomRight };
                        if (         bottom && !right && !left) return { type: TileSpace.tiles.bottom };
                        if (         bottom &&            left) return { type: TileSpace.tiles.bottomLeft };
                        if (!top && !bottom &&            left) return { type: TileSpace.tiles.left };
                        return { type: Object.values(TileSpace.tiles).includes(i) && (x % 2) && (y % 2) ? i++ : 0 };
                    })
            );
    }
    /**
     * Resize the grid space such that it tiles over the entire given width and height
     * @param {number} width 
     * @param {number} height 
     */
    resizeViewport(width, height) {
        while (this.drawables.length)
            this.render.destroyDrawable(this.drawables.pop(), TileSpace.drawableLayer);
        // needs to be perfectly square for rotation to work
        this.screenWh = new Point(width, height).div(this.tileWh).add(3).clamp(1);
    }
    /**
     * Loads in all the assets this space needs
     * @param {import('./assets').Assets} assets 
     */
    loadAssets(assets) {
        this.skins[TileSpace.tiles.error] =       this.render.createSVGSkin(assets.get('error'));
        this.skins[TileSpace.tiles.topLeft] =     this.render.createSVGSkin(assets.get('top-left'));
        this.skins[TileSpace.tiles.top] =         this.render.createSVGSkin(assets.get('top'));
        this.skins[TileSpace.tiles.topRight] =    this.render.createSVGSkin(assets.get('top-right'));
        this.skins[TileSpace.tiles.right] =       this.render.createSVGSkin(assets.get('right'));
        this.skins[TileSpace.tiles.bottomRight] = this.render.createSVGSkin(assets.get('bottom-right'));
        this.skins[TileSpace.tiles.bottom] =      this.render.createSVGSkin(assets.get('bottom'));
        this.skins[TileSpace.tiles.bottomLeft] =  this.render.createSVGSkin(assets.get('bottom-left'));
        this.skins[TileSpace.tiles.left] =        this.render.createSVGSkin(assets.get('left'));
    }
    /**
     * Converts the world space coords to screen space
     * @param {Point} point The point, in world space
     * @returns {Point} The point, in screen space
     */
    worldToScreen(point) {
        return point.clone()
            .mul(this.camera.scale)
            .sub(this.screenWh.clone().div(2)) // align all of these tiles as if they are one solid drawable
            .add(1) // offset back by one tile to abscure the left and top edges
            .mul(this.tileWh) // move coords to screen space
            .sub(this.camera.pos.clone().mod(this.tileWh)) // offset by the camera, wrapping back around when necessary
            .rotate(this.camera.dir) // rotate by the camera rotation
            .scale(-1, 1)
    }
    /**
     * Converts a screen space coord to world space
     * @param {number} x The X axis of the screen coord
     * @param {number} y The Y axis of the screen coord
     * @returns {Point} The world space point
     */
    screenToWorld(x,y) {
        return new Point(x, y)
            .add(this.camera.pos.clone().mod(this.tileWh).scale(1,-1))
            .add(this.screenWh.clone()
                .mul(this.tileWh)
                .scale(-1, 1)
                .sub([this.window.width, this.window.height])
                .div(2)
            )
            .rotate(this.camera.dir)
            .div(this.tileWh)
            .scale(-1,-1)
            .div(this.camera.scale)
            .add(this.screenWh)
            .translate(-0.5, -0.5)
            .clamp(1);
    }
    /**
     * Updates the properties of a drawable to the latest state
     * @param {number} draw The id of the drawable
     * @param {Point} point The coords of this drawable, in world space
     * @param {[number]} tile The tile draw on this drawable
     */
    updateTileDrawable(draw, point, tile) {
        this.render.updateDrawablePosition(draw, this.worldToScreen(point));
        this.render.updateDrawableDirection(draw, 180 - this.camera.dir);
        for (const name in tile.effects) 
            this.render.updateDrawableEffect(draw, name, tile.effects[name]);
        
        // dont draw tile type 0 (empty)
        if (tile.type === 0)
            return this.render.updateDrawableVisible(draw, false);
        // make sure this drawable is showing incase it was previously marked empty
        this.render.updateDrawableVisible(draw, true);
        // if the renderer doesnt actually have this tile type, use the error type instead
        if (!this.render._allSkins[this.skins[tile.type]]) 
            this.render.updateDrawableSkinId(draw, this.skins[TileSpace.tiles.error]);
        else
            this.render.updateDrawableSkinId(draw, this.skins[tile.type]);
        // compute the size that forces the requested skin inside the tile size
        const size = Math.max(...this.render._allDrawables[draw].skin.size);
        this.render.updateDrawableScale(draw, this.tileWh.clone().div(size).mul(this.camera.scale).mul(100));
    }
    makeReducedMap() {
        const map = new Array(this.screenWh[0]).fill(0)
            .map((_,x) =>
                new Array(this.screenWh[1]).fill(0)
                    .map((_,y) => {
                        const p = new Point(x, (this.screenWh[1] - y) -1);
                        const mapPos = this.wrap 
                            ? p.clone()
                                .sub(this.screenWh.clone().div(2))
                                .add(this.camera.pos.clone().div(this.tileWh).clamp(1))
                                .mod([this.wh[0], Infinity])
                                .clamp(1)
                            : p.clone().add(this.camera.pos.clone().div(this.tileWh).clamp(1)).clamp(1);
                        return {
                            type: this.map[mapPos[0]]?.[mapPos[1]]?.type ?? 0, 
                            displayPos: p,
                            realPos: mapPos,
                            effects: {
                                ...(this.map[mapPos[0]]?.[mapPos[1]]?.effects ?? {}),
                                repeatX: 1,
                                repeatY: 1
                            }
                        };
                    }));
        const xMap = [];
        for (let x = 0; x < this.screenWh[0]; x++) {
            xMap[x] = [];
            for (let y = 0; y < this.screenWh[1]; y++) {
                if (xMap[x].at(-1)?.type !== map[x][y].type) {
                    xMap[x].push(map[x][y]);
                    continue;
                }
                xMap[x].at(-1).effects.repeatY++;
            }
        }
        const yMap = [];
        for (let x = 0; x < this.screenWh[0]; x++) {
            let isEqual = false;
            for (let y = 0; y < xMap[x].length; y++) {
                if (!xMap[x -1]) break;
                if (xMap[x -1][y].type !== xMap[x][y].type) break;
                if (xMap[x -1][y].effects.repeatX !== xMap[x][y].effects.repeatX) break;
                if (xMap[x -1][y].effects.repeatY !== xMap[x][y].effects.repeatY) break;
                isEqual = y >= (xMap[x].length -1);
            }
            if (!isEqual) {
                yMap.push(xMap[x]);
                continue;
            }
            yMap.at(-1).forEach(v => v.effects.repeatX++);
        }
        return yMap;
    }
    draw() {
        const map = this.makeReducedMap();
        // hide all drawables, this way leftover cache isnt visible
        this.drawables.forEach(draw => this.render.updateDrawableVisible(draw, false));
        let i = 0;
        for (let x = 0; x < map.length; x++) {
            const column = map[x];
            for (let y = 0; y < column.length; y++) {
                const tile = column[y];
                // ignore all empty tiles
                if (tile.type === 0) continue;
                if (!this.drawables[i]) this.drawables[i] = this.render.createDrawable(TileSpace.drawableLayer);
                const draw = this.drawables[i];
                const pos = tile.displayPos.clone();
                this.updateTileDrawable(draw, pos, tile);
                i++;
            }
        }
        // half the number of drawables cached each frame they arent being used
        if (i < (this.drawables.length -1)) {
            const toRemove = (this.drawables.length - i);
            const cutAt = i + Math.floor(toRemove / 2);
            const removed = this.drawables.splice(cutAt, toRemove);
            removed.forEach(draw => this.render.destroyDrawable(draw, TileSpace.drawableLayer));
        }
    }
}
module.exports = TileSpace