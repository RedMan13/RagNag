class RGBAColor extends Float32Array {
    constructor(r,g,b,a) {
        super(4);
        this[0] = r;
        this[1] = g;
        this[2] = b;
        this[3] = a;
    }
}
class HSVAColor extends Float32Array {
    constructor(h,s,v,a) {
        super(4);
        this[0] = h;
        this[1] = s;
        this[2] = v;
        this[3] = a;
    }
}

module.exports = Color;