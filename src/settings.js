const { keys, descriptives, names } = require('./key-actions.js');
const { InputScreen, Text, Button } = require('./input-screen.js');
const fs = require('fs');

class Settings {
    /** @type {import('./renderer/src/RenderWebGL.js')} */
    render = null;
    /** @type {InputScreen} */
    screen = null;
    constructor(render) {
        this.render = render;
        this.screen = new InputScreen(this.render, 10, 0,0, 1,1);
        this.screen.fromXML(fs.readFileSync(require.resolve('./key-settings.xml')));
        const grid = this.screen.getByID('keys');
        for (const key in keys) {
            grid.tiles.push(new Text(this.render, key));
            const pattern = keys[key][0].map(key => descriptives[key]).join(' + ');
            grid.tiles.push(new Button(this.render, pattern));
        }
    }
    draw() { this.screen.draw(); }
}
module.exports = Settings;