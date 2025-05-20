class Point extends Float32Array {
    static fromGrid(idx, width) {
        width = Math.ceil(width);
        return new Point(idx % width, Math.floor(idx / width));
    }
    /**
     * Creates an abstract point that can be operated on with funtions such as .translate
     * @param {number} x The X axis of this point
     * @param {number} y The Y axis of this point
     */
    constructor(x,y) {
        super(2);
        this[0] = x;
        this[1] = y ?? x;
    }
    /**
     * Converts this point into a 2D array index
     * @param {number} width The width of the space to make an index for
     * @returns {number} The index number of this point
     */
    toIndex(width) {
        return this[0] + (this[1] * width);
    }

    /**
     * Rotates a point around 0,0
     * @param {number} dir The angle to rotate this point by
     * @returns {Point} This point
     */
    rotate(dir) {
        const rad = dir / 180 * Math.PI;
        // PLEASE tell me how to do this correctly, i tried the pm implement and it just doesnt work for some reason
        const int = Math.atan2(this[0], this[1]);
        const len = Math.sqrt((this[0] **2) + (this[1] **2));
        this[0] = Math.cos(rad + int) * len;
        this[1] = Math.sin(rad + int) * len;
        return this;
    }
    /**
     * Translates this point by some amount on the X and Y axis
     * @param {number|Point} x The value to translate this point by on the X axis
     * @param {number?} y The value to translate this point by on the Y axis
     * @returns {Point} This point
     */
    translate(x,y) {
        if (x?.length >= 2) [x,y] = x;
        this[0] += x;
        this[1] += y;
        return this;
    }
    /**
     * Scales the position of this point by some amount on the X and Y axis
     * @param {number|Point} x The multiplier to apply to the X axis, or also the Y axis
     * @param {number?} y The multiplier to apply to the Y axis
     * @returns {Point} This point
     */
    scale(x,y) {
        if (x?.length >= 2) [x,y] = x;
        y ??= x;
        this[0] *= x;
        this[1] *= y;
        return this;
    }
    /**
     * Clamps this point to some place value (e.g. .clamp(3) to clamp to the lowest third)
     * @param {number} place Which place value to clamp down to
     * @returns {Point} This point
     */
    clamp(place) {
        this[0] = Math.floor(this[0] / place) * place;
        this[1] = Math.floor(this[1] / place) * place;
        return this;
    }

    /**
     * Creates a new point using this points values
     * @returns {Point} Copy of this point
     */
    clone() {
        return new Point(this[0], this[1]);
    }
    /**
     * Sets this point to some value.
     * @param {number|Point} x What value to set this points X axis to, or a point to mirror
     * @param {number?} y What value to set this points Y axis to
     * @returns {Point} This point
     */
    set(x,y) {
        if (x?.length >= 2) [x,y] = x;
        y ??= x;
        this[0] = x;
        this[1] = y;
        return this;
    }

    /**
     * Adds two points together
     * @param {Point|number} p2 The point, or number, to add with this point
     * @returns {Point} This point
     */
    add(p2) {
        if (p2?.length !== 2) p2 = [p2,p2];
        this[0] += p2[0];
        this[1] += p2[1];
        return this;
    }
    /**
     * Subtracts two points from each other
     * @param {Point|number} p2 The point, or number, to subtract from this point
     * @returns {Point} This point
     */
    sub(p2) {
        if (p2?.length !== 2) p2 = [p2,p2];
        this[0] -= p2[0];
        this[1] -= p2[1];
        return this;
    }
    /**
     * Multiplies to points with together
     * @param {Point|number} p2 The point, or number, to multiply with
     * @returns {Point} This point
     */
    mul(p2) {
        if (p2?.length !== 2) p2 = [p2,p2];
        this[0] *= p2[0];
        this[1] *= p2[1];
        return this;
    }
    /**
     * Divides two points from each other
     * @param {Point|number} p2 The point, or number, to divide with
     * @returns {Point} This point
     */
    div(p2) {
        if (p2?.length !== 2) p2 = [p2,p2];
        this[0] /= p2[0];
        this[1] /= p2[1];
        return this;
    }
    /**
     * Computes the remainder of deviding this point
     * @param {Point|number} p2 The point, or number, to divide with
     * @returns {Point} This point
     */
    mod(p2) {
        if (p2?.length !== 2) p2 = [p2,p2];
        if (Number.isFinite(p2[0])) this[0] = ((this[0] % p2[0]) + p2[0]) % p2[0];
        if (Number.isFinite(p2[1])) this[1] = ((this[1] % p2[1]) + p2[1]) % p2[1];
        return this;
    }
    /**
     * Moves a point to the power of another
     * @param {Point|number} p2 The point, or number, to move to the power of
     * @returns {Point} This point
     */
    pow(p2) {
        if (p2?.length !== 2) p2 = [p2,p2];
        this[0] **= p2[0];
        this[1] **= p2[1];
        return this;
    }
    /**
     * Sets this point to its absolute
     * @returns {Point} This point
     */
    abs() {
        this[0] = Math.abs(this[0]);
        this[1] = Math.abs(this[1]);
        return this;
    }
}
module.exports = Point;