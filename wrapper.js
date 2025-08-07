const fs = require('fs');
const path = require('path');
const { ImageData } = require('canvas');
global.window = {};
global.window.ImageData = ImageData;
global.self = global;
global.ImageData = ImageData;
const { init: initFrame } = require("3d-core-raub");

const { window, canvas } = initFrame({ isWebGL2: true, isGles3: true, title: 'Rag Nag' });
window.ImageData = ImageData;
if (false != process.env.DEVELOP) {
    // load from source, without mixing in anything
    const MainGame = require('./src/index.js');
    const game = new MainGame(window, canvas);
    global.assets = game.assets;
    game.loadAssets()
        .then(() => {
            game._initKeys();
            game._initRenderer();
            game._initTileSpace();
            game._initDebugTiles();
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
                splices[dest] ??= [];
                splices[dest].push([args[0], args[1], args[3]]);
                break;
            }
            }
        }
    }
    for (const file in splices) {
        let data = fs.readFileSync(file, 'utf8');
        const offs = [[0,0]];
        for (const [start, end, content] of splices[file]) {
            const startOff = offs.findLast(([root]) => start >= root)[1];
            const endOffIdx = offs.findLastIndex(([root]) => end >= root);
            const endOff = offs[endOffIdx][1];
            data = data.slice(0, start + startOff) + content + data.slice(end + endOff);
            offs.splice(endOffIdx +1, 0, [end, endOff + (content.length - (end - start))]);
        }
        fs.writeFileSync(file, data);
    }

    try {
        const MainGame = require('./run/index.js');
        const game = new MainGame(window, canvas);
        global.assets = game.assets;
        game.loadAssets()
            .then(() => {
                game._initKeys();
                game._initRenderer();
                game._initTileSpace();
                game._initDebugTiles();
                game.start()
            });
    } catch (err) {
        throw err;
    }
}