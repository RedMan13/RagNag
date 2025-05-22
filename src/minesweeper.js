const TileSpace = require('./tile-drawing');

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
        grid.camera.pos[0] = -window.width / 2;
        grid.camera.pos[1] = -window.height / 2;
        this.grid.map = new Array(grid.wh[0]).fill([]).map(() => new Array(grid.wh[1]).fill([0]).map(() => [TileSpace.tiles.unopened]));
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
    uncover(x,y) {
        if (!this.map[x]?.[y]) return;
        if (this.map[x][y] === TileSpace.tiles.bomb) {
            for (let x = 0; x < this.grid.wh[0]; x++)
                for (let y = 0; y < this.grid.wh[1]; y++)
                    if (this.map[x][y] === TileSpace.tiles.bomb)
                        this.grid.map[x][y][0] = TileSpace.tiles.bomb;
            return;
        }
        this.grid.map[x][y][0] = this.map[x][y];
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
                this.grid.map[x][y][0] = this.map[x][y];
                if (this.map[x][y] === TileSpace.tiles.bombs0) {
                    for (let ox = -1; ox < 2; ox++)
                        for (let oy = -1; oy < 2; oy++)
                            if (this.grid.map[x + ox]?.[y + oy]?.[0] === TileSpace.tiles.unopened) {
                                if (ox === oy && oy === 0) continue;
                                if (this.map[x + ox][y + oy] === TileSpace.tiles.bombs0)
                                    needsTouched.push([x + ox, y + oy]);
                                this.grid.map[x + ox][y + oy][0] = this.map[x + ox][y + oy];
                            }
                }
            }
        }
    }
    tick() { this.grid.draw(); }
}
module.exports = MineSweeper;