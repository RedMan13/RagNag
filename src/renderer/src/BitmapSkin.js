const twgl = require("twgl.js");

const Skin = require("./Skin");
const { Image, Canvas } = require('canvas');

class BitmapSkin extends Skin {
    /**
     * Create a new Bitmap Skin.
     * @extends Skin
     * @param {!int} id - The ID for this Skin.
     * @param {!RenderWebGL} renderer - The renderer which will use this skin.
     */
    constructor(id, renderer) {
        super(id, renderer);

        /** @type {!int} */
        this._costumeResolution = 1;

        /** @type {Array<int>} */
        this._textureSize = [0, 0];
    }

    /**
     * Dispose of this object. Do not use it after calling this method.
     */
    dispose() {
        if (this._texture) {
            this._renderer.gl.deleteTexture(this._texture);
            this._texture = null;
        }
        super.dispose();
    }

    /**
     * @return {Array<number>} the "native" size, in texels, of this skin.
     */
    get size() {
        return [
            this._textureSize[0] / this._costumeResolution,
            this._textureSize[1] / this._costumeResolution,
        ];
    }

    /**
     * @param {Array<number>} scale - The scaling factors to be used.
     * @return {WebGLTexture} The GL texture representation of this skin when drawing at the given scale.
     */
    // eslint-disable-next-line no-unused-vars
    getTexture(scale) {
        return this._texture || super.getTexture();
    }

    /**
     * Set the contents of this skin to a snapshot of the provided bitmap data.
     * @param {ImageData|Image|import('canvas').Canvas|HTMLVideoElement} bitmapData - new contents for this skin.
     * @param {int} [costumeResolution=1] - The resolution to use for this bitmap.
     * @param {Array<number>} [rotationCenter] - Optional rotation center for the bitmap. If not supplied, it will be
     * calculated from the bounding box
     * @fires Skin.event:WasAltered
     */
    setBitmap(bitmapData, costumeResolution, rotationCenter) {
        if (!bitmapData.width || !bitmapData.height) {
            super.setEmptyImageData();
            return;
        }
        const gl = this._renderer.gl;

        // TW: We want to use <canvas> as-is because reading ImageData wastes memory.
        // However, vanilla LLK/scratch-vm will reuse any canvas that we get here for other costumes,
        // which will cause bugs when Silhouette lazily reads the canvas data.
        // Turbo Warp/scratch-vm does not reuse canvases and will set canvas.reusable = false.
        let textureData = bitmapData;
        if (
            bitmapData instanceof Canvas &&
            bitmapData.reusable !== false
        ) {
            const context = bitmapData.getContext("2d", { willReadFrequently: true });
            textureData = context.getImageData(
                0,
                0,
                bitmapData.width,
                bitmapData.height,
            );
        }

        if (this._texture === null) {
            const textureOptions = {
                auto: false,
                wrap: gl.CLAMP_TO_EDGE,
                width: textureData.width,
                height: textureData.height
            };

            this._texture = twgl.createTexture(gl, textureOptions);
        }

        this._setTexture(textureData);

        // Do these last in case any of the above throws an exception
        this._costumeResolution = costumeResolution || 2;
        this._textureSize = BitmapSkin._getBitmapSize(bitmapData);

        if (typeof rotationCenter === "undefined")
            rotationCenter = this.calculateRotationCenter();
        this._rotationCenter[0] = rotationCenter[0];
        this._rotationCenter[1] = rotationCenter[1];

        this.emitWasAltered();
    }

    /**
     * @param {ImageData|Image|import('canvas').Canvas|HTMLVideoElement} bitmapData - bitmap data to inspect.
     * @returns {Array<int>} the width and height of the bitmap data, in pixels.
     * @private
     */
    static _getBitmapSize(bitmapData) {
        if (bitmapData instanceof Image) {
            return [
                bitmapData.naturalWidth || bitmapData.width,
                bitmapData.naturalHeight || bitmapData.height,
            ];
        }

        // ImageData or import('canvas').Canvas
        return [bitmapData.width, bitmapData.height];
    }
}

module.exports = BitmapSkin;
