const { keys, descriptives, names } = require('./key-actions.js');
const fs = require('fs');

class Settings {
    /** @type {import('./renderer/src/RenderWebGL.js')} */
    render = null;
    /** @type {import('./debuggers.js').DebuggerTiles} */
    tiles = null;
    constructor(render, tiles) {
        this.render = render;
        this.tiles = tiles;
    }
}
module.exports = Settings;