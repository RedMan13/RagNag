const TileSpace = require('./tile-drawing.js');

class MineSweeper {
    /**
     * @param {import('./renderer/src/RenderWebGL')} render 
     * @param {import('glfw-raub').Window} window 
     * @param {TileSpace} grid
     */
    constructor(render, window, grid) {
        this.render = render;
        this.window = window;
        this.grid = grid;
        grid.resizeWorld(20, 20);
        grid.wrap = false;
        grid.camera.pos[0] = -((grid.screenWh[0] - grid.wh[0]) * grid.tileWh[0]) / 2;
        grid.camera.pos[1] = -((grid.screenWh[1] - grid.wh[0]) * grid.tileWh[0]) / 2;
        this.loadAssets();
        this.grid.map = new Array(grid.wh[0]).fill([]).map(() => new Array(grid.wh[1]).fill([0]).map(() => ({ type: TileSpace.tiles.unopened })));
        this.map = new Array(grid.wh[0]).fill([]).map(() => new Array(grid.wh[1]).fill([0]).map(() => TileSpace.tiles.bombs0));
        for (let i = 0; i < 40; i++) {
            const x = Math.floor(Math.random() * grid.wh[0]);
            const y = Math.floor(Math.random() * grid.wh[1]);
            if (this.map[x -1]?.[y -1]) this.map[x -1][y -1]++;
            if (this.map[x   ]?.[y -1]) this.map[x   ][y -1]++;
            if (this.map[x +1]?.[y -1]) this.map[x +1][y -1]++;
            if (this.map[x -1]?.[y   ]) this.map[x -1][y   ]++;
            if (this.map[x   ]?.[y   ]) this.map[x   ][y   ] = TileSpace.tiles.bomb;
            if (this.map[x +1]?.[y   ]) this.map[x +1][y   ]++;
            if (this.map[x -1]?.[y -1]) this.map[x -1][y +1]++;
            if (this.map[x   ]?.[y -1]) this.map[x   ][y +1]++;
            if (this.map[x +1]?.[y -1]) this.map[x +1][y +1]++;
        }
    }
    async loadAssets() {
        Object.assign(TileSpace.tiles, {
            unopened: 10,
            flagged: 11,
            bombs0: 12,
            bombs1: 13,
            bombs2: 14,
            bombs3: 15,
            bombs4: 16,
            bombs5: 17,
            bombs6: 18,
            bombs7: 19,
            bombs8: 20,
            bomb: 21
        });
        
        this.grid.skins[TileSpace.tiles.unopened] = this.render.createBitmapSkin(await assets.registerAsset('unopened', 'unopened.png'), 1);
        this.grid.skins[TileSpace.tiles.flagged] =  this.render.createBitmapSkin(await assets.registerAsset('flagged', 'flagged.png'), 1);
        this.grid.skins[TileSpace.tiles.bombs0] =   this.render.createBitmapSkin(await assets.registerAsset('zero-bombs', '0-bombs.png'), 1);
        this.grid.skins[TileSpace.tiles.bombs1] =   this.render.createBitmapSkin(await assets.registerAsset('one-bomb', '1-bombs.png'), 1);
        this.grid.skins[TileSpace.tiles.bombs2] =   this.render.createBitmapSkin(await assets.registerAsset('two-bombs', '2-bombs.png'), 1);
        this.grid.skins[TileSpace.tiles.bombs3] =   this.render.createBitmapSkin(await assets.registerAsset('three-bombs', '3-bombs.png'), 1);
        this.grid.skins[TileSpace.tiles.bombs4] =   this.render.createBitmapSkin(await assets.registerAsset('four-bombs', '4-bombs.png'), 1);
        this.grid.skins[TileSpace.tiles.bombs5] =   this.render.createBitmapSkin(await assets.registerAsset('five-bombs', '5-bombs.png'), 1);
        this.grid.skins[TileSpace.tiles.bombs6] =   this.render.createBitmapSkin(await assets.registerAsset('six-bombs', '6-bombs.png'), 1);
        this.grid.skins[TileSpace.tiles.bombs7] =   this.render.createBitmapSkin(await assets.registerAsset('seven-bombs', '7-bombs.png'), 1);
        this.grid.skins[TileSpace.tiles.bombs8] =   this.render.createBitmapSkin(await assets.registerAsset('eight-bombs', '8-bombs.png'), 1);
        this.grid.skins[TileSpace.tiles.bomb] =     this.render.createBitmapSkin(await assets.registerAsset('bomb', 'bomb.png'), 1);
    }
    uncover(x,y) {
        if (!this.map[x]?.[y]) return;
        if (this.map[x][y] === TileSpace.tiles.bomb) {
            for (let x = 0; x < this.grid.wh[0]; x++)
                for (let y = 0; y < this.grid.wh[1]; y++)
                    if (this.map[x][y] === TileSpace.tiles.bomb)
                        this.grid.map[x][y].type = TileSpace.tiles.bomb;
            return;
        }
        this.grid.map[x][y].type = Math.min(this.map[x][y], 21);
        // recursion unwrap solution, as the board is big enough for js to complain about recursion length
        const needsTouched = [
            [x -1, y -1],
            [x   , y -1],
            [x +1, y -1],
            [x -1, y   ],
            [x +1, y   ],
            [x -1, y +1],
            [x   , y +1],
            [x +1, y +1]
        ];
        if (this.map[x][y] === TileSpace.tiles.bombs0) {
            while (needsTouched.length) {
                // force the loop out if we excede the number of tiles
                if (needsTouched.length > (this.grid.wh[0] * this.grid.wh[1])) break;
                const [x,y] = needsTouched[0];
                needsTouched.splice(0, 1);
                if (!this.map[x]?.[y]) continue;
                this.grid.map[x][y].type = Math.min(this.map[x][y], 21);
                if (this.map[x][y] === TileSpace.tiles.bombs0) {
                    for (let ox = -1; ox < 2; ox++)
                        for (let oy = -1; oy < 2; oy++)
                            if (this.grid.map[x + ox]?.[y + oy]?.type === TileSpace.tiles.unopened) {
                                if (ox === oy && oy === 0) continue;
                                if (this.map[x + ox][y + oy] === TileSpace.tiles.bombs0)
                                    needsTouched.push([x + ox, y + oy]);
                                this.grid.map[x + ox][y + oy].type = Math.min(this.map[x + ox][y + oy], 21);
                            }
                }
            }
        }
    }
    tick() { this.grid.draw(); }
}
module.exports = MineSweeper;