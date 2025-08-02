const TileSpace = require('./tile-drawing');
const Point = require('./point');

class Entity {
    /** @type {import('./renderer/src/RenderWebGL')} */
    render = null;
    draw = -1;
    skin = 2;
    /** @type {number} */
    id = null;
    /** @type {Point} */
    pos = new Point(0,0);
    /** @type {Point} */
    vel = new Point(0,0);
    /** @type {Point} */
    size = new Point(1,1);
    /** @type {number} */
    kind = null;
    /** @type {null|'left'|'right'|'down'|'up'} */
    collided = null;
    density = 1;
    gravity = false;
    constructor(id, render, kind, x,y) {
        this.id = id;
        this.render = render;
        this.kind = kind;
        this.pos.set(x,y);
        this.draw = render.createDrawable('entities');
        this.skin = kind;
    }
    /** @param {TileSpace} tiles */
    step({ tiles, maxSpeed }, neighbors) { // 400 tiles a second at 20 vel
        // remove NaN and Infinity, it doesnt help us at all
        this.vel.max(-maxSpeed).min(maxSpeed);
        this.pos.max(-maxSpeed).min(maxSpeed);
        this.vel[0] ||= 0;
        this.vel[1] ||= 0;
        this.pos[0] ||= 0;
        this.pos[1] ||= 0;
        // compute air drag and friction
        this.vel[0] /= 2;
        this.vel[1] /= 2;
        if (this.collided) this.vel[0] /= 1.5;
        if (this.gravity) this.vel[1] -= 1;
        this.collided = null;
        const distance = this.vel.clone().div(tiles.tileWh).abs();
        const signs = [Math.sign(this.vel[0]), Math.sign(this.vel[1])];
        while (distance[1] > 0) {
            const tilePos = this.pos.clone().div(tiles.tileWh).clamp(1).mod(tiles.wh);
            const tile = tiles.map[tilePos[0]]?.[Point.mod(tilePos[1] + signs[1], tiles.wh)];
            if (tile?.[0] > 0) {
                this.vel[1] = 0;
                if (signs[1] === -1) {
                    this.pos[1] = Math.floor(this.pos[1] / tiles.tileWh[1]) * tiles.tileWh[1];
                    this.collided = 'down';
                } else {
                    this.pos[1] = Math.ceil(this.pos[1] / tiles.tileWh[1]) * tiles.tileWh[1];
                    this.collided = 'up';
                }
                break;
            }
            this.pos[1] += Math.min(distance[1], 1) * tiles.tileWh[1] * signs[1];
            distance[1] -= Math.min(distance[1], 1);
        }
        // walk forward one tile on each axis
        while (distance[0] > 0) {
            const tilePos = this.pos.clone().div(tiles.tileWh).clamp(1).mod(tiles.wh);
            const tile = tiles.map[Point.mod(tilePos[0] + signs[0], tiles.wh[0])]?.[tilePos[1]];
            if (tile?.[0] > 0) {
                this.vel[0] = 0;
                if (signs[0] === -1) {
                    this.pos[0] = Math.ceil(this.pos[0] / tiles.tileWh[0]) * tiles.tileWh[0];
                    this.collided = 'left';
                } else {
                    this.pos[0] = Math.floor(this.pos[0] / tiles.tileWh[0]) * tiles.tileWh[0];
                    this.collided = 'right';
                }
                break;
            }
            this.pos[0] += Math.min(distance[0], 1) * tiles.tileWh[0] * signs[0];
            distance[0] -= Math.min(distance[0], 1);
        }
        const leo = -(this.size[0] / 2) * tiles.tileWh[0];
        const reo = (this.size[0] / 2) * tiles.tileWh[0];
        const teo = (this.size[1] / 2) * tiles.tileWh[1];
        const beo = -(this.size[1] / 2) * tiles.tileWh[1];
        const lem = this.pos[0] + leo;
        const rem = this.pos[0] + reo;
        const tem = this.pos[1] + teo;
        const bem = this.pos[1] + beo;
        neighbors.forEach(ent => {
            const le = ent.pos[0] - ((ent.size[0] / 2) * tiles.tileWh[0]);
            const re = ent.pos[0] + ((ent.size[0] / 2) * tiles.tileWh[0]);
            const te = ent.pos[1] + ((ent.size[1] / 2) * tiles.tileWh[1]);
            const be = ent.pos[1] - ((ent.size[1] / 2) * tiles.tileWh[1]);
            if (lem < re && lem > le && (tem <= te || bem >= be)) {
                this.collided = 'left';
                this.pos[0] = re + leo;
            }
            if (rem < le && rem > re && (tem <= te || bem >= be)) {
                this.collided = 'right';
                this.pos[0] = le + reo;
            }
            if (bem < te && bem > be && (lem >= le || rem <= re)) {
                this.collided = 'down';
                this.pos[1] = te + beo;
            }
            if (tem < be && tem > te && (lem >= le || rem <= re)) {
                this.collided = 'up';
                this.pos[1] = be + teo;
            }
        });
    }
    getCorners(tiles) {
        return [
            this.pos.clone().add(this.size.clone().div(2).scale(-1,1).mul(tiles.tileWh)),
            this.pos.clone().add(this.size.clone().div(2).scale(1,1).mul(tiles.tileWh)),
            this.pos.clone().add(this.size.clone().div(2).scale(1,-1).mul(tiles.tileWh)),
            this.pos.clone().add(this.size.clone().div(2).scale(-1,-1).mul(tiles.tileWh))
        ]
    }
    /** @param {TileSpace} tiles */
    transmit(tiles) {
        const skin = this.render._allSkins[this.skin];
        this.render.updateDrawableSkinId(this.draw, this.skin);
        this.render.updateDrawableScale(this.draw, tiles.tileWh.clone().div(skin.size).mul(this.size).mul(100));
        this.render.updateDrawablePosition(this.draw, this.pos.clone()
            .add(tiles.camera.pos.clone().scale(1, -1))
            .sub(tiles.tileWh)
            .rotate(tiles.camera.dir));
        this.render.updateDrawableDirection(this.draw, 180 - tiles.camera.dir);
    }
}
class Physics {
    /** @type {TileSpace} */
    tiles = null;
    /** @type {import('./renderer/src/RenderWebGL')} */
    render = null;
    /** @type {Entity[]} */
    entities = [];
    /** @type {{ [id: number]: Entity[] }} */
    zones = [];
    /** @type {number} */
    ids = 0;
    /** @type {number} is the speed of sound irl, computed with tiles being one foot in length */
    maxSpeed = 343 / (1 / 3.281);
    constructor(tiles, render) {
        this.render = render;
        this.tiles = tiles;
    }
    loadAssets(assets) {

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
    }
    tick() {
        const entities = this.entities;
        entities.forEach(ent => {
            const zonePos = ent.pos
                .clone()
                .div(this.tiles.tileWh.clone().mul(3))
                .clamp(1);
            const zone = this.zones[zonePos[0]]?.[zonePos[1]] ?? [];
            ent.step(this, zone);
        });
        this.zones = [];
        entities.forEach(ent => {
            ent.getCorners(this.tiles).forEach(point => {
                const pos = point
                    .div(this.tiles.tileWh.clone().mul(3))
                    .clamp(1);
                this.zones[pos[0]] ??= [];
                this.zones[pos[0]][pos[1]] ??= [];
                this.zones[pos[0]][pos[1]].push(ent);
            });
        });  
    }
    draw() {
        this.entities.forEach(ent => ent.transmit(this.tiles));
    }
}
module.exports = Physics;