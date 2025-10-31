const Skin = require("./Skin");

class RectangleSkin extends Skin {
    /**
     * Create a new Bitmap Skin.
     * @extends Skin
     * @param {!int} id - The ID for this Skin.
     * @param {!RenderWebGL} renderer - The renderer which will use this skin.
     */
    constructor(id, renderer) {
        super(id, renderer);

        /** @type {[number, number]} */
        this._radius = [];
        /** @type {number} */
        this._startRad = 0;
        /** @type {number} */
        this._endRad = Math.PI *2;
        /** @type {number[]} */
        this._fillColor = [1,1,1,1];
        /** @type {number[]} */
        this._outlineColor = [0,0,0,0];
        /** @type {number} */
        this._outlineThickness = 1;

        /** @type {Array<int>} */
        this._textureSize = [0, 0];
        this.setEmptyImageData();
    }
    get drawMode() { return 'rectangle' }

    /**
     * @return {Array<number>} the "native" size, in texels, of this skin.
     */
    get size() {
        return [
            this._textureSize[0],
            this._textureSize[1],
        ];
    }

    /**
     * Confgiures this skins rendering arguments.
     * @param {[number,number]} size - What the two radi of the elipse are
     * @param {number[]} [fillColor=[1,1,1,1]] - Defines the color to be used for the fill of the elipse, in 0-1 RGBA
     * @param {number[]} [outlineColor=[0,0,0,0]] - Defines the color to be used for the outline of the elipse, in 0-1 RGBA
     * @param {number} [outlineThickness=1] - The thickness of the outline to be drawn
     * @param {Array<number>} [rotationCenter] - Optional rotation center for the elipse. If not supplied, it will be the center
     */
    configure(size, fillColor = [1,1,1,1], outlineColor = [0,0,0,0], outlineThickness = 1, rotationCenter) {
        this._outlineColor = [outlineColor[0],outlineColor[1],outlineColor[2],outlineColor[3]];
        this._fillColor = [fillColor[0],fillColor[1],fillColor[2],fillColor[3]];
        this._outlineThickness = outlineThickness;
        this._textureSize = [size[0], size[1]];

        if (typeof rotationCenter === "undefined")
            rotationCenter = this.calculateRotationCenter();
        this._rotationCenter[0] = rotationCenter[0];
        this._rotationCenter[1] = rotationCenter[1];
    }
    /**
     * Update and returns the uniforms for this skin.
     * @param {Array<number>} scale - The scaling factors to be used.
     * @returns {object.<string, *>} the shader uniforms to be used when rendering with this Skin.
     */
    getUniforms (scale) {
        this._uniforms.u_skin = this.getTexture(scale);
        this._uniforms.u_skinSize = this.size;
        this._uniforms.u_fillColor = this._fillColor;
        this._uniforms.u_outlineColor = this._outlineColor;
        this._uniforms.u_outlineThickness = this._outlineThickness;
        return this._uniforms;
    }
}

module.exports = RectangleSkin;
