const TileSpace = require('./tile-drawing');
const Point = require('./point');

class Entity {
    /** @type {import('./renderer/src/RenderWebGL')} */
    render = null;
    /** @type {number} */
    draw = -1;
    /** @type {number} */
    id = null;
    /** @type {Point} */
    pos = new Point(0,0);
    /** @type {Point} */
    vel = new Point(0,0);
    /** @type {number} */
    kind = null;
    static minVelocity = new Point(-10,-20);
    static maxVelocity = new Point(10,20);
    constructor(id, render, kind, x,y) {
        this.id = id;
        this.render = render;
        this.kind = kind;
        this.pos.set(x,y);
        this.draw = render.createDrawable('entities');
        this.render.updateDrawableSkinId(this.draw, 0);
    }
    /** @param {TileSpace} tiles */
    step(tiles) {
        this.vel[0] /= 2;
        this.vel[1] -= 1;
        this.vel.max(Entity.minVelocity).min(Entity.maxVelocity);
        const distance = this.vel.clone().div(tiles.tileWh).abs();
        const signs = [Math.sign(this.vel[0]), Math.sign(this.vel[1])];
        // walk forward one tile on each axis
        while (distance[0] > 0) {
            const tilePos = this.pos.clone().div(tiles.tileWh).clamp(1).mod(tiles.wh);
            const tile = tiles.map[tilePos[0] + signs[0]]?.[tilePos[1]];
            if (tile?.[0] > 0) {
                this.vel[0] = 0;
                this.pos[0] = Math.floor(this.pos[0] / tiles.tileWh[0]) * tiles.tileWh[0];
                break;
            }
            this.pos[0] += Math.min(distance[0], 1) * tiles.tileWh[0] * signs[0];
            distance[0] -= Math.min(distance[0], 1);
        }
        while (distance[1] > 0) {
            const tilePos = this.pos.clone().div(tiles.tileWh).clamp(1).mod(tiles.wh);
            const tile = tiles.map[tilePos[0]]?.[tilePos[1] + signs[1]];
            if (tile?.[0] > 0) {
                this.vel[1] = 0;
                this.pos[1] = Math.floor(this.pos[1] / tiles.tileWh[1]) * tiles.tileWh[1];
                break;
            }
            this.pos[1] += Math.min(distance[1], 1) * tiles.tileWh[1] * signs[1];
            distance[1] -= Math.min(distance[1], 1);
        }
    }
    /** @param {TileSpace} tiles */
    transmit(tiles) {
        this.render.updateDrawablePosition(this.draw, this.pos.clone()
            .mod([tiles.wh[0] * tiles.tileWh[0], Infinity])
            .sub(tiles.camera.pos.clone().scale(1, -1))
            .rotate(tiles.camera.dir));
        this.render.updateDrawableDirection(this.draw, 180 - tiles.camera.dir);
    }
}
class Physics {
    /** @type {TileSpace} */
    tiles = null;
    /** @type {import('./renderer/src/RenderWebGL')} */
    render = null;
    /** @type {{ id: number, draw:  }[]} */
    entities = [];
    /** @type {number} */
    ids = 0;
    constructor(tiles, render) {
        this.render = render;
        this.tiles = tiles;
    }
    async loadAssets(assets) {

    }
    createEntity(x,y, kind) {
        const id = this.ids++;
        const ent = new Entity(id, this.render, kind, x,y);
        this.entities.push(ent);
        return id;
    }
    moveEntity(id, x,y) {
        const ent = this.entities.find(ent => ent.id === id);
        ent.pos[0] = x;
        ent.pos[1] = y;
    }
    nudgeEntity(id, x,y) {
        const ent = this.entities.find(ent => ent.id === id);
        ent.vel[0] += x;
        ent.vel[1] += y;
        ent.pos[0] += 1 * Math.sign(x);
        ent.pos[1] += 1 * Math.sign(y);
    }
    tick() {
        this.entities.forEach(ent => ent.step(this.tiles));
    }
    draw() {
        this.entities.forEach(ent => ent.transmit(this.tiles));
    }
}
module.exports = Physics;