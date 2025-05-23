const twgl = require('twgl.js');

const CanvasMeasurementProvider = require('./util/canvas-measurement-provider');
const Skin = require('./Skin');
const { createCanvas } = require('canvas');

const BubbleStyle = {
    MAX_LINE_WIDTH: 170, // Maximum width, in Scratch pixels, of a single line of text

    MIN_WIDTH: 50, // Minimum width, in Scratch pixels, of a text bubble
    STROKE_WIDTH: 4, // Thickness of the stroke around the bubble. Only half's visible because it's drawn under the fill
    PADDING: 10, // Padding around the text area
    CORNER_RADIUS: 16, // Radius of the rounded corners
    TAIL_HEIGHT: 12, // Height of the speech bubble's "tail". Probably should be a constant.

    FONT: 'Helvetica', // Font to render the text with
    FONT_SIZE: 14, // Font size, in Scratch pixels
    FONT_HEIGHT_RATIO: 0.9, // Height, in Scratch pixels, of the text, as a proportion of the font's size
    LINE_HEIGHT: 16, // Spacing between each line of text

    COLORS: {
        BUBBLE_FILL: 'white',
        BUBBLE_STROKE: 'rgba(0, 0, 0, 0.15)',
        TEXT_FILL: '#575E75'
    }
};

const MAX_SCALE = 10;

class TextBubbleSkin extends Skin {
    /**
     * Create a new text bubble skin.
     * @param {!int} id - The ID for this Skin.
     * @param {!RenderWebGL} renderer - The renderer which will use this skin.
     * @constructor
     * @extends Skin
     */
    constructor (id, renderer) {
        super(id, renderer);

        /** @type {import('canvas').Canvas} */
        this._canvas = createCanvas(1,1);

        /** @type {Array<number>} */
        this._size = [0, 0];

        /** @type {number} */
        this._renderedScale = 0;

        /** @type {Array<string>} */
        this._lines = [];

        /** @type {object} */
        this._textAreaSize = {width: 0, height: 0};

        /** @type {string} */
        this._bubbleType = '';

        /** @type {boolean} */
        this._pointsLeft = false;

        /** @type {boolean} */
        this._textDirty = true;

        /** @type {boolean} */
        this._textureDirty = true;

        this.measurementProvider = new CanvasMeasurementProvider(this._canvas.getContext('2d'));
        this.textWrapper = renderer.createTextWrapper(this.measurementProvider);
        this._props = BubbleStyle

        this._restyleCanvas();
    }

    /**
     * Dispose of this object. Do not use it after calling this method.
     */
    dispose () {
        if (this._texture) {
            this._renderer.gl.deleteTexture(this._texture);
            this._texture = null;
        }
        this._canvas = null;
        super.dispose();
    }

    /**
     * @return {Array<number>} the dimensions, in Scratch units, of this skin.
     */
    get size () {
        if (this._textDirty) {
            this._reflowLines();
        }
        return this._size;
    }

    /**
     * Set parameters for this text bubble.
     * @param {!string} type - either "say" or "think".
     * @param {!string} text - the text for the bubble.
     * @param {!boolean} pointsLeft - which side the bubble is pointing.
     */
    setTextBubble (type, text, pointsLeft, props) {
        this._text = text;
        this._bubbleType = type;
        this._pointsLeft = pointsLeft;
        if (typeof props === 'object') this._props = props

        this._textDirty = true;
        this._textureDirty = true;
        this.emitWasAltered();
    }

    /**
     * Re-style the canvas after resizing it. This is necessary to ensure proper text measurement.
     */
    _restyleCanvas () {
        this._canvas.getContext('2d').font = `${this._props.FONT_SIZE}px ${this._props.FONT}, sans-serif`;
    }

    /**
     * Update the array of wrapped lines and the text dimensions.
     */
    _reflowLines () {
        const ctx = this._canvas.getContext('2d')
        this._lines = this.textWrapper.wrapText(this._props.MAX_LINE_WIDTH, this._text);

        // Measure width of longest line to avoid extra-wide bubbles
        let longestLineWidth = 0;
        for (const line of this._lines) {
            longestLineWidth = Math.max(longestLineWidth, this.measurementProvider.measureText(line));
        }
        this._props.LINE_HEIGHT = 1.23 * this._props.FONT_SIZE

        // Calculate the canvas-space sizes of the padded text area and full text bubble
        const paddedWidth = Math.max(longestLineWidth, this._props.MIN_WIDTH) + (this._props.PADDING * 2);
        const paddedHeight = (this._props.LINE_HEIGHT * this._lines.length) + (this._props.PADDING * 2);

        this._textAreaSize.width = paddedWidth;
        this._textAreaSize.height = paddedHeight;

        this._size[0] = paddedWidth + this._props.STROKE_WIDTH;
        this._size[1] = paddedHeight + this._props.STROKE_WIDTH + this._props.TAIL_HEIGHT;

        this._textDirty = false;
    }

    /**
     * Render this text bubble at a certain scale, using the current parameters, to the canvas.
     * @param {number} scale The scale to render the bubble at
     */
    _renderTextBubble (scale) {
        const ctx = this._canvas.getContext('2d');

        if (this._textDirty) {
            this._reflowLines();
        }

        // Calculate the canvas-space sizes of the padded text area and full text bubble
        const paddedWidth = this._textAreaSize.width;
        const paddedHeight = this._textAreaSize.height;

        // Resize the canvas to the correct screen-space size
        this._canvas.width = Math.ceil(this._size[0] * scale);
        this._canvas.height = Math.ceil(this._size[1] * scale);
        this._restyleCanvas();

        // Reset the transform before clearing to ensure 100% clearage
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

        ctx.scale(scale, scale);
        ctx.translate(this._props.STROKE_WIDTH * 0.5, this._props.STROKE_WIDTH * 0.5);

        // If the text bubble points leftward, flip the canvas
        ctx.save();
        if (this._pointsLeft) {
            ctx.scale(-1, 1);
            ctx.translate(-paddedWidth, 0);
        }

        // Draw the bubble's rounded borders
        ctx.beginPath();
        ctx.moveTo(this._props.CORNER_RADIUS, paddedHeight);
        ctx.arcTo(0, paddedHeight, 0, paddedHeight - this._props.CORNER_RADIUS, this._props.CORNER_RADIUS);
        ctx.arcTo(0, 0, paddedWidth, 0, this._props.CORNER_RADIUS);
        ctx.arcTo(paddedWidth, 0, paddedWidth, paddedHeight, this._props.CORNER_RADIUS);
        ctx.arcTo(paddedWidth, paddedHeight, paddedWidth - this._props.CORNER_RADIUS, paddedHeight,
            this._props.CORNER_RADIUS);

        // Translate the canvas so we don't have to do a bunch of width/height arithmetic
        ctx.save();
        ctx.translate(paddedWidth - this._props.CORNER_RADIUS, paddedHeight);

        // Draw the bubble's "tail"
        if (this._bubbleType === 'say') {
            // For a speech bubble, draw one swoopy thing
            ctx.bezierCurveTo(0, 4, 4, 8, 4, 10);
            ctx.arcTo(4, 12, 2, 12, 2);
            ctx.bezierCurveTo(-1, 12, -11, 8, -16, 0);

            ctx.closePath();
        } else {
            // For a thinking bubble, draw a partial circle attached to the bubble...
            ctx.arc(-16, 0, 4, 0, Math.PI);

            ctx.closePath();

            // and two circles detached from it
            ctx.moveTo(-7, 7.25);
            ctx.arc(-9.25, 7.25, 2.25, 0, Math.PI * 2);

            ctx.moveTo(0, 9.5);
            ctx.arc(-1.5, 9.5, 1.5, 0, Math.PI * 2);
        }

        // Un-translate the canvas and fill + stroke the text bubble
        ctx.restore();

        ctx.fillStyle = this._props.COLORS.BUBBLE_FILL;
        ctx.strokeStyle = this._props.COLORS.BUBBLE_STROKE;
        ctx.lineWidth = this._props.STROKE_WIDTH;

        ctx.stroke();
        ctx.fill();

        // Un-flip the canvas if it was flipped
        ctx.restore();

        // Draw each line of text
        ctx.fillStyle = this._props.COLORS.TEXT_FILL;
        ctx.font = `${this._props.FONT_SIZE}px ${this._props.FONT}, sans-serif`;
        const lines = this._lines;
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber];
            ctx.fillText(
                line,
                this._props.PADDING,
                this._props.PADDING + (this._props.LINE_HEIGHT * lineNumber) +
                    (this._props.FONT_HEIGHT_RATIO * this._props.FONT_SIZE)
            );
        }

        this._renderedScale = scale;
    }

    updateSilhouette (scale = [100, 100]) {
        // Ensure a silhouette exists.
        this.getTexture(scale);
    }

    /**
     * @param {Array<number>} scale - The scaling factors to be used, each in the [0,100] range.
     * @return {WebGLTexture} The GL texture representation of this skin when drawing at the given scale.
     */
    getTexture (scale) {
        // The texture only ever gets uniform scale. Take the larger of the two axes.
        const scaleMax = scale ? Math.max(Math.abs(scale[0]), Math.abs(scale[1])) : 100;
        const requestedScale = Math.min(MAX_SCALE, scaleMax / 100);

        // If we already rendered the text bubble at this scale, we can skip re-rendering it.
        if (this._textureDirty || this._renderedScale !== requestedScale) {
            this._renderTextBubble(requestedScale);
            this._textureDirty = false;

            const context = this._canvas.getContext('2d');
            const textureData = context.getImageData(0, 0, this._canvas.width, this._canvas.height);

            const gl = this._renderer.gl;

            if (this._texture === null) {
                const textureOptions = {
                    auto: false,
                    wrap: gl.CLAMP_TO_EDGE
                };

                this._texture = twgl.createTexture(gl, textureOptions);
            }

            this._setTexture(textureData);
        }

        return this._texture;
    }

    getAllProps() {
        return BubbleStyle
    }
}

module.exports = TextBubbleSkin;
