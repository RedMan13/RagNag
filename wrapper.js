const fs = require('fs');
const path = require('path');
const { ImageData } = require('canvas');
const Image = require('image-raub');
global.window = {};
global.window.ImageData = ImageData;
global.self = global;
global.ImageData = ImageData;
const { init: initFrame } = require("3d-core-raub");

const { window, canvas } = initFrame({
    isWebGL2: true,
    isGles3: true,
    title: 'Rag Nag',
    msaa: 3
});
const icon = new Image('./icon.png');
icon.onload = () => window.icon = icon;
window.ImageData = ImageData;
if (process.env.DEVELOP && false != process.env.DEVELOP) {
    // load from source, without mixing in anything
    // that includes try/catch, we specifically want errors to drop out of the app entirely
    const MainGame = require('./src/index.js');
    const game = new MainGame(window, canvas);
    global.assets = game.assets;
    game.loadAssets()
        .then(() => {
            game._initKeys();
            game._initRenderer();
            game._initTileSpace();
            game.start()
        });
} else {
    fs.cpSync('./src', './run', { recursive: true });

    // vondy
    const enabled = require('./enabled-patches.json');
    const source = path.resolve('./run');
    const patchs = [];
    /** @type {{ [file: string]: [number, number, string] }} */
    const splices = {};
    for (const name of fs.readdirSync('./patches')) {
        if (!enabled.includes(name)) continue;
        const root = path.resolve('./patches', name);
        const structure = require(path.resolve(root, 'index.json'));
        patchs.push(structure);
        for (const [type, ...args] of structure.changes) {
            switch (type) {
            case 'copy': {
                const src = path.resolve(root, args[0]);
                const dest = path.resolve(source, args[1]);
                if (!src.startsWith(root)) break;
                if (!dest.startsWith(source)) break;
                fs.mkdirSync(path.dirname(args[1]), { recursive: true });
                fs.copyFileSync(src, dest);
                break;
            }
            case 'splice': {
                const dest = path.resolve(source, args[2]);
                if (!dest.startsWith(source)) break;
                const data = fs.readFileSync(dest, 'utf8');
                splices[dest] ??= [];
                if (Array.isArray(args[0])) {
                    const off = data.indexOf(args[0][0]);
                    if (off === -1)
                        throw new SyntaxError(`Could not find landmark "${args[0][0]}" in ${dest}`);
                    args[0] = off + args[0][0].length + args[0][1];
                }
                if (Array.isArray(args[1])) {
                    const off = data.indexOf(args[1][0], args[0]);
                    if (off === -1)
                        throw new SyntaxError(`Could not find landmark "${args[1][0]}" in ${dest}`);
                    args[1] = off + args[1][1];
                } else {
                    args[1] = args[0] + args[1];
                }
                splices[dest].push([args[0], args[1], args[3]]);
                break;
            }
            }
        }
    }
    for (const file in splices) {
        let data = fs.readFileSync(file, 'utf8');
        let align = 0;
        const offs = [[0,0]];
        for (const [start, end, content] of splices[file]) {
            const startOff = offs.findLast(([root]) => start >= root)[1];
            const endOffIdx = offs.findLastIndex(([root]) => end >= root);
            const endOff = offs[endOffIdx][1];
            data = data.slice(0, start + startOff + align) + content + data.slice(end + endOff + align);
            offs.splice(endOffIdx +1, 0, [end, endOff + (content.length - (end - start))]);
        }
        fs.writeFileSync(file, data);
    }

    const MainGame = require('./run/index.js');
    const game = new MainGame(window, canvas);
    function reportError(err) {
        const render = game.render;
        const draw = render.createDrawable(MainGame.layers.tooltip);
        const skin = render.createTextCostumeSkin({
            text: 'The following error has caused the game to crash;\n' + (err?.stack ?? err) + '\nData may have not saved. Please note in any reports what was happening at the time of this error.',
            font: 'sans-serif',
            color: 'white',
            maxWidth: render.getNativeSize()[0],
            size: 20,
            align: 'left',
            strokeWidth: 1,
            strokeColor: 'black',
            rainbow: false
        });
        render.updateDrawableSkinId(draw, skin);
        // render.updateDrawablePosition(draw, [0, render.getNativeSize()[1] / 2]);
        window.loop(() => { render.draw() });
    }
    process.on('uncaughtException', reportError);
    process.on('unhandledRejection', reportError);
    global.assets = game.assets;
    game._initRenderer();
    game.loadAssets()
        .then(() => {
            game._initKeys();
            game._initTileSpace();
            game.start();
        });
}