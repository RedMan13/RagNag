const { keys, stringifyKey } = require('./key-actions.js');
const { DebuggerTiles } = require('./debuggers.js');

class Settings {
    /** @type {import('./renderer/src/RenderWebGL.js')} */
    render = null;
    /** @type {import('glfw-raub').Window} */
    window = null;
    /** @type {DebuggerTiles} */
    tiles = null;
    constructor(render, window) {
        this.render = render;
        this.window = window;
        this.tiles = new DebuggerTiles(this.render.getNativeSize()[0], this.render.getNativeSize()[1], 'settings', this.render, window, {});
        this.tiles.direction = 'down';
        this.tiles.alignmentColumn = 'center';
        this.tiles.alignmentRow = 'start';
        this.tiles.scrolls = true;
        for (const key in keys) {
            let needsDraw = true;
            let setting = false;
            let listens = null;
            let bind = stringifyKey(key);
            this.tiles.createTile(/** @param {import('canvas').CanvasRenderingContext2D} ctx */ function(ctx) {
                if (!needsDraw) return true;
                needsDraw = false;
                ctx.resetTransform();
                ctx.clearRect(0,0, this.width, this.height);
                ctx.scale(1, -1);
                ctx.translate(0, -this.height);
                ctx.antialias = 'default';
                ctx.strokeStyle = '#AAA';
                const gradient = ctx.createLinearGradient((this.width / 2) + (this.width / 4), 2, (this.width / 2) + (this.width / 4), this.height -2);
                gradient.addColorStop(0, '#B0C4DE');
                gradient.addColorStop(0.5, '#8c9cb1');
                ctx.fillStyle = gradient;
                ctx.lineWidth = 2;
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo((this.width / 2) +2,2);
                ctx.lineTo(this.width -2, 2);
                ctx.lineTo(this.width -2, this.height -2);
                ctx.lineTo((this.width / 2) +2, this.height -2);
                ctx.closePath();
                ctx.fill();
                ctx.textBaseline = 'top';
                ctx.textAlign = 'start';
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.font = '20px';
                ctx.strokeText(key, 2.5,2.5);
                ctx.fillText(key, 2.5,2.5);
                ctx.textAlign = 'center';
                const text = setting
                    ? typeof setting === 'boolean'
                        ? 'Press again to finish'
                        : stringifyKey(setting)
                    : bind;
                ctx.strokeText(text, (this.width / 2) + (this.width / 4) -2.5,2.5);
                ctx.fillText(text, (this.width / 2) + (this.width / 4) -2.5,2.5);
            }, () => {
                needsDraw = true;
                setting = !setting;
                console.log(setting);
                if (!setting) {
                    this.window.off('keydown', listens);
                    if (!Array.isArray(bind)) return;
                    bind = stringifyKey(keys[key][0] = bind);
                    return;
                }
                this.window.on('keydown', listens = e => {
                    if (typeof setting === 'boolean') bind = setting = [];
                    setting.push(e.keyCode);
                    needsDraw = true;
                });
            }, render.getNativeSize()[0] / 2, 29, keys[key][3]);
        }
        this.tiles.resetPositions();
    }
    draw() { this.tiles.renderTiles(); }
    fireClicks() { this.tiles.fireClicks(); }
}
module.exports = Settings;