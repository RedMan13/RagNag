const Point = require('./point');

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
        bottom: 9,
        unopened: 10,
        flagged: 11,
        bombs0: 12,
        bombs1: 13,
        bombs2: 14,
        bombs3: 15,
        bombs4: 16,
        bombs5: 17,
        bombs6: 18,
        bombs7: 19,
        bombs8: 20,
        bomb: 21
    };
    /** @type {{ [key: number]: number }} */
    skins = {};
    /** @type {import('glfw-raub').Window} */
    window = null;
    /** @type {import('./renderer/src/RenderWebGL')} */
    render = null;
    /** @type {[number][][]} */
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
        /** @type {Point} */
        pos: new Point(0,0),
        /** @type {number} */
        dir: 90
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
     * Resize the map thats used to make the world space
     * @param {number} width 
     * @param {number} height 
     */
    resizeWorld(width, height) {
        this.wh = new Point(width, height);
        this.map = new Array(this.wh[0]).fill([])
            .map((_, x) => 
                new Array(this.wh[1]).fill([])
                    .map((_, y) => {
                        // return [TileSpace.tiles.error];
                        const left = x === 0;
                        const right = x === (this.wh[0] -1);
                        const top = y === 0
                        const bottom = y === (this.wh[1] -1);
                        if ( top &&                       left) return [TileSpace.tiles.topLeft];
                        if ( top &&            !right && !left) return [TileSpace.tiles.top];
                        if ( top &&             right         ) return [TileSpace.tiles.topRight];
                        if (!top && !bottom &&  right         ) return [TileSpace.tiles.right];
                        if (         bottom &&  right         ) return [TileSpace.tiles.bottomRight];
                        if (         bottom && !right && !left) return [TileSpace.tiles.bottom];
                        if (         bottom &&            left) return [TileSpace.tiles.bottomLeft];
                        if (!top && !bottom &&            left) return [TileSpace.tiles.left];
                        return [TileSpace.tiles.none];
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
        this.drawables = new Array(this.screenWh[0] * this.screenWh[1]).fill(-1)
            .map(() => this.render.createDrawable(TileSpace.drawableLayer));
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

        this.skins[TileSpace.tiles.unopened] = this.render.createBitmapSkin(assets.get('unopened'), 1);
        this.skins[TileSpace.tiles.flagged] =  this.render.createBitmapSkin(assets.get('flagged'), 1);
        this.skins[TileSpace.tiles.bombs0] =   this.render.createBitmapSkin(assets.get('zero-bombs'), 1);
        this.skins[TileSpace.tiles.bombs1] =   this.render.createBitmapSkin(assets.get('one-bomb'), 1);
        this.skins[TileSpace.tiles.bombs2] =   this.render.createBitmapSkin(assets.get('two-bombs'), 1);
        this.skins[TileSpace.tiles.bombs3] =   this.render.createBitmapSkin(assets.get('three-bombs'), 1);
        this.skins[TileSpace.tiles.bombs4] =   this.render.createBitmapSkin(assets.get('four-bombs'), 1);
        this.skins[TileSpace.tiles.bombs5] =   this.render.createBitmapSkin(assets.get('five-bombs'), 1);
        this.skins[TileSpace.tiles.bombs6] =   this.render.createBitmapSkin(assets.get('six-bombs'), 1);
        this.skins[TileSpace.tiles.bombs7] =   this.render.createBitmapSkin(assets.get('seven-bombs'), 1);
        this.skins[TileSpace.tiles.bombs8] =   this.render.createBitmapSkin(assets.get('eight-bombs'), 1);
        this.skins[TileSpace.tiles.bomb] =     this.render.createBitmapSkin(assets.get('bomb'), 1);
    }
    /**
     * Converts the world space coords to screen space
     * @param {Point} point The point, in world space
     * @returns {Point} The point, in screen space
     */
    worldToScreen(point) {
        return point.clone()
            .mul(this.tileWh) // move coords to screen space
            .sub(this.screenWh.clone().div(2).mul(this.tileWh)) // align all of these tiles as if they are one solid drawable
            .add(this.tileWh.clone()) // offset back by one tile to abscure the left and top edges
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
    updateTileDrawable(draw, point, [type]) {
        this.render.updateDrawablePosition(draw, this.worldToScreen(point));
        this.render.updateDrawableDirection(draw, 180 - this.camera.dir);

        // dont draw tile type 0 (empty)
        if (type === 0)
            return this.render.updateDrawableVisible(draw, false);
        // make sure this drawable is showing incase it was previously marked empty
        this.render.updateDrawableVisible(draw, true);
        // if the renderer doesnt actually have this tile type, use the error type instead
        if (!this.render._allSkins[this.skins[type]]) 
            this.render.updateDrawableSkinId(draw, this.skins[TileSpace.tiles.error]);
        else
            this.render.updateDrawableSkinId(draw, this.skins[type]);
        // compute the size that forces the requested skin inside the tile size
        const size = Math.max(...this.render._allDrawables[draw].skin.size);
        this.render.updateDrawableScale(draw, this.tileWh.clone().div(size).mul(100));
    }
    draw() {
        this.drawables.forEach((id, idx) => {
            const p = Point.fromGrid(idx, this.screenWh[0]);
            const mapPos = this.wrap 
                ? p.clone()
                    .sub(this.screenWh.clone().div(2))
                    .add(this.camera.pos.clone().div(this.tileWh).clamp(1))
                    .mod([this.wh[0], Infinity])
                    .clamp(1)
                : p.clone().add(this.camera.pos.clone().div(this.tileWh).clamp(1)).clamp(1);
            this.updateTileDrawable(id, p, this.map[mapPos[0]]?.[mapPos[1]] ?? [0]);
        })
    }
}
module.exports = TileSpace