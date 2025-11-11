const Skin = require("./Skin");

class ElipseSkin extends Skin {
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
    get drawMode() { return 'elipse' }

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
     * @param {Array<number>} scale - The scaling factors to be used.
     * @return {WebGLTexture} The GL texture representation of this skin when drawing at the given scale.
     */
    // eslint-disable-next-line no-unused-vars
    getTexture(scale) {
        return super.getTexture();
    }

    /**
     * Confgiures this skins rendering arguments.
     * @param {[number,number]} radius - What the two radi of the elipse are
     * @param {number[]} [fillColor=[1,1,1,1]] - Defines the color to be used for the fill of the elipse, in 0-1 RGBA
     * @param {Array<number>} [rotationCenter] - Optional rotation center for the elipse. If not supplied, it will be the center
     * @param {number} [startAngle=0] - Optional, defines at what angle the elipse starts
     * @param {number} [endAngle=360] - Optional, defines at what angle the elipse stops
     * @param {number[]} [outlineColor=[0,0,0,0]] - Defines the color to be used for the outline of the elipse, in 0-1 RGBA
     * @param {number} [outlineThickness=1] - Defines the thickness of the outline
     */
    configure(radius, fillColor = [1,1,1,1], rotationCenter, startAngle = 0, endAngle = 360, outlineColor = [0,0,0,0], outlineThickness = 1) {
        this._startRad = startAngle * Math.PI / 180;
        this._endRad = endAngle * Math.PI / 180;
        this._radius = [radius[0], radius[1]];
        this._outlineColor = [outlineColor[0],outlineColor[1],outlineColor[2],outlineColor[3]];
        this._fillColor = [fillColor[0],fillColor[1],fillColor[2],fillColor[3]];
        this._outlineThickness = outlineThickness;
        this._textureSize = [radius[0] *2, radius[1] *2];

        if (typeof rotationCenter === "undefined")
            rotationCenter = this.calculateRotationCenter();
        this._rotationCenter[0] = rotationCenter[0];
        this._rotationCenter[1] = rotationCenter[1];
        this.emitWasAltered();
    }
    /**
     * Update and returns the uniforms for this skin.
     * @param {Array<number>} scale - The scaling factors to be used.
     * @returns {object.<string, *>} the shader uniforms to be used when rendering with this Skin.
     */
    getUniforms (scale) {
        this._uniforms.u_skin = this.getTexture(scale);
        this._uniforms.u_skinSize = this.size;
        this._uniforms.u_elipseStart = this._startRad;
        this._uniforms.u_elipseEnd = this._endRad;
        this._uniforms.u_elipseRadius = this._radius;
        this._uniforms.u_fillColor = this._fillColor;
        this._uniforms.u_outlineColor = this._outlineColor;
        this._uniforms.u_outlineThickness = this._outlineThickness +1;
        return this._uniforms;
    }
}

module.exports = ElipseSkin;
