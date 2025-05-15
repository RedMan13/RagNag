const twgl = require("twgl.js");

const PenSkin = require("./PenSkin");
const ShaderManager = require("./ShaderManager");
const { createCanvas, Image } = require('canvas');

/**
 * All scaled renderings of the SVGs are stored in an array. The 1.0 scale of
 * the SVGs is stored at the 8th index. The smallest possible 1 / 256 scale
 * rendering is stored at the 0th index.
 * @const {number}
 */
const INDEX_OFFSET = 8;

class GridSkin extends PenSkin {
    /**
     * Create a new grid skin.
     * @param {!int} id - The ID for this Skin.
     * @param {import('./RenderWebGL')} renderer - The renderer which will use this skin.
     * @constructor
     * @extends PenSkin
     */
    constructor(id, renderer) {
        super(id, renderer);

        /** @type {number} */
        this._selfDrawable = renderer.createDrawable('temp');

        /** @type {Skin[]} */
        this.assets = [];

        /** @type {number[]} */
        this._tileSize = [0, 0];

        /** @type {Array<number>} */
        this._size = [0, 0];

        /** @type {Array<number>} */
        this._transform = [0, 0];

        /** @type {Array<WebGLTexture>} */
        this._scaledMIPs = [];

        /** @type {number} */
        this._largestMIPScale = 0;

        /**
         * Ratio of the size of the SVG and the max size of the WebGL texture
         * @type {Number}
         */
        this._maxTextureScale = 1;
    }

    /**
     * Dispose of this object. Do not use it after calling this method.
     */
    dispose() {
        this.resetMIPs();
        super.dispose();
    }

    /**
     * @return {Array<number>} the natural size, in Scratch units, of this skin.
     */
    get size() {
        return [this._size[0], this._size[1]];
    }

    useNearest(scale, drawable) {
        // If the effect bits for mosaic, pixelate, whirl, or fisheye are set, use linear
        if (
            (drawable.enabledEffects &
                (ShaderManager.EFFECT_INFO.fisheye.mask |
                    ShaderManager.EFFECT_INFO.whirl.mask |
                    ShaderManager.EFFECT_INFO.pixelate.mask |
                    ShaderManager.EFFECT_INFO.mosaic.mask)) !==
            0
        ) {
            return false;
        }

        // We can't use nearest neighbor unless we are a multiple of 90 rotation
        if (drawable._direction % 90 !== 0) {
            return false;
        }

        // Because SVG skins' bounding boxes are currently not pixel-aligned, the idea here is to hide blurriness
        // by using nearest-neighbor scaling if one screen-space pixel is "close enough" to one texture pixel.
        // If the scale of the skin is very close to 100 (0.99999 variance is okay I guess)
        // TODO: Make this check more precise. We should use nearest if there's less than one pixel's difference
        // between the screen-space and texture-space sizes of the skin. Mipmaps make this harder because there are
        // multiple textures (and hence multiple texture spaces) and we need to know which one to choose.
        if (
            Math.abs(scale[0]) > 99 &&
            Math.abs(scale[0]) < 101 &&
            Math.abs(scale[1]) > 99 &&
            Math.abs(scale[1]) < 101
        ) {
            return true;
        }
        return false;
    }

    /**
     * Create a MIP for a given scale.
     * @param {number} scale - The relative size of the MIP
     * @return {SVGMIP} An object that handles creating and updating SVG textures.
     */
    createMIP(scale, transform) {
        const isLargestMIP = this._largestMIPScale < scale;
        // TW: Silhouette will lazily read image data from our <canvas>. However, this canvas is shared
        // between the Skin and Silhouette so changing it here can mess up Silhouette. To prevent that,
        // we will force the silhouette to synchronously read the image data before we mutate the
        // canvas, unless the new MIP is the largest MIP, in which case doing so is unnecessary as we
        // will update the silhouette later anyways.
        if (!isLargestMIP) {
            this._silhouette.unlazy();
        }

        if (!transform) transform = [0, 0];
        if (!transform[0]) transform = [0, 0];
        if (!transform[1]) transform = [0, 0];

        if (
            this._tileSize[0] <= 0 ||
            this._tileSize[1] <= 0 
        )
            return this._emptyImageTexture;
        const width = this.assets.length * this._tileSize[0];
        const height = this._tileSize[1];
        this._nativeSize = [width, height];
        this.setRenderQuality(scale);
        this._renderer.penClear(this._id);
        for (let i = 0, skinId = this.assets[0]; i < this.assets.length; skinId = this.assets[++i]) {
            const skin = this._renderer._allSkins[skinId];
            if (!skin) continue;
            this._renderer.updateDrawablePosition(this._selfDrawable, [i * this._tileSize[0], this._tileSize[1] / 2]);
            const max = Math.max(skin.size[0] / this._tileSize[0], skin.size[1] / this._tileSize[1]);
            this._renderer.updateDrawableScale(this._selfDrawable, [1 / max, 1 / max]);
            this._renderer.updateDrawableSkinId(this._selfDrawable, skinId);
            this._renderer.penStamp(this._id, this._selfDrawable);
        }

        return this._texture;
    }

    updateSilhouette(scale = [100, 100]) {
        // Ensure a silhouette exists.
        this.getTexture(scale);
        this._silhouette.unlazy();
    }

    /**
     * @param {Array<number>} scale - The scaling factors to be used, each in the [0,100] range.
     * @param {Array<number>} transform - The scaling factors to be used, each in the [0,100] range.
     * @return {WebGLTexture} The GL texture representation of this skin when drawing at the given scale.
     */
    getTexture(scale, transform) {
        // sometimes transform has undefined passed into it
        if (!transform) transform = [0, 0];
        if (typeof transform[0] !== "number") transform = [0, 0];
        if (typeof transform[1] !== "number") transform = [0, 0];

        // The texture only ever gets uniform scale. Take the larger of the two axes.
        const scaleMax = scale
            ? Math.max(Math.abs(scale[0]), Math.abs(scale[1]))
            : 100;
        const requestedScale = Math.min(scaleMax / 100, this._maxTextureScale);

        // Math.ceil(Math.log2(scale)) means we use the "1x" texture at (0.5, 1] scale,
        // the "2x" texture at (1, 2] scale, the "4x" texture at (2, 4] scale, etc.
        // This means that one texture pixel will always be between 0.5x and 1x the size of one rendered pixel,
        // but never bigger than one rendered pixel--this prevents blurriness from blowing up the texture too much.
        const mipLevel = Math.max(
            Math.ceil(Math.log2(requestedScale)) + INDEX_OFFSET,
            0,
        );
        // Can't use bitwise stuff here because we need to handle negative exponents
        const mipScale = Math.pow(2, mipLevel - INDEX_OFFSET);

        // this was split into 2 if statements because its hard to read
        if (this._svgImageLoaded) {
            // if there is no scaled mip for this level
            // or the passed in transform doesnt equal the current transform
            if (
                !(
                    this._scaledMIPs[mipLevel] &&
                    this.isTransformEqual(this._transform, transform)
                )
            ) {
                this._scaledMIPs[mipLevel] = this.createMIP(
                    mipScale,
                    transform || [0, 0],
                );
                this._transform = transform;
            }
        }

        return this._scaledMIPs[mipLevel] || super.getTexture();
    }

    /**
     * Checks the values of both transform arrays instead of the entire array.
     * This is because it causes some goofy bug if you check the entire array where they dont equal for some reason.
     * @param {Array<number>} transform
     * @param {Array<number>} checkingTransform
     */
    isTransformEqual(transform, checkingTransform) {
        if (!transform) return false;
        if (!checkingTransform) return false;
        let value = 0;
        if (transform[0] === checkingTransform[0]) value++;
        if (transform[1] === checkingTransform[1]) value++;
        return value === 2;
    }

    /**
     * Do a hard reset of the existing MIPs by deleting them.
     */
    resetMIPs() {
        this._scaledMIPs.forEach((oldMIP) =>
            this._renderer.gl.deleteTexture(oldMIP),
        );
        this._scaledMIPs.length = 0;
        this._largestMIPScale = 0;
    }

    /**
     * Add a skin as an asset for this skin
     * @param {number} id - The skin id to be used inside of this skin.
     * @fires Skin.event:WasAltered
     */
    addSkin(id) {
        this.assets.push(id);
        this.resetMIPs();
        this.emitWasAltered();
    }
    /**
     * Sets the size of all tiles 
     * @param {[number,number]} size The size
     */
    setTileSize(size) {
        this._tileSize[0] = size[0];
        this._tileSize[1] = size[1];
        this.resetMIPs();
        this.emitWasAltered();
    }
}

module.exports = GridSkin;
