const TileSpace = require('./tile-drawing');
const Point = require('./point');
const { createCanvas } = require('canvas');

class Entity {
    /** @type {import('./renderer/src/RenderWebGL')} */
    render = null;
    draw = -1;
    /** @type {number} */
    id = null;
    /** @type {Point} */
    pos = new Point(0,0);
    /** @type {Point} */
    vel = new Point(0,10);
    /** @type {Point} */
    size = new Point(1,1);
    /** @type {number} */
    kind = null;
    /** @type {null|'left'|'right'|'down'|'up'} */
    collided = null;
    /** @type {null|'left'|'right'|'down'|'up'} */
    wasCollided = null;
    density = 1;
    gravity = true;
    constructor(id, render, kind, x,y) {
        this.id = id;
        this.render = render;
        this.kind = kind;
        this.pos.set(x,y);
        this.draw = render.createDrawable('entities');
        this.size[0] = Physics.entityDatas[kind].dimensions[0];
        this.size[1] = Physics.entityDatas[kind].dimensions[1];
    }
    /** @param {TileSpace} tiles */
    step({ tiles, maxSpeed }, neighbors) { // 400 tiles a second at 20 vel
        // remove NaN, Infinity and over-speed, it doesnt help us at all
        this.vel.max(-maxSpeed).min(maxSpeed);
        this.vel[0] ||= 0;
        this.vel[1] ||= 0;
        this.pos[0] ||= 0;
        this.pos[1] ||= 0;
        // compute air drag and friction
        this.vel[0] /= 1.25;
        if (!this.gravity) this.vel.div(2);
        if (this.collided) this.vel[0] /= 2;
        if (this.gravity) this.vel[1] -= 1;
        this.collided = null;
        const distance = this.vel.clone().abs();
        const signs = [Math.sign(this.vel[0]), Math.sign(this.vel[1])];
        const leo = -(this.size[0] / 2) * tiles.tileWh[0];
        const reo = (this.size[0] / 2) * tiles.tileWh[0];
        const teo = (this.size[1] / 2) * tiles.tileWh[1];
        const beo = -(this.size[1] / 2) * tiles.tileWh[1];
        const lem = this.pos[0] + leo;
        const rem = this.pos[0] + reo;
        const tem = this.pos[1] + teo;
        const bem = this.pos[1] + beo;
        const leor = -Math.ceil((this.size[0] / 2) * tiles.tileWh[0]);
        const reor = Math.ceil((this.size[0] / 2) * tiles.tileWh[0]);
        const teor = Math.ceil((this.size[1] / 2) * tiles.tileWh[1]);
        const beor = -Math.ceil((this.size[1] / 2) * tiles.tileWh[1]);
        while (distance[1] > 0) {
            for (let i = leor; i <= reor; i++) {
                const tilePos = this.pos
                    .clone()
                    .add([i, (this.size[1] / 2) * signs[1]])
                    .add([0, signs[1] < 0 ? Math.floor(-this.size[1] * tiles.tileWh[1]) : 0])
                    .div(tiles.tileWh)
                    .scale(-1, 1)
                    .translate(tiles.wh[0], 0)
                    .clamp(1);
                const pos = this.pos
                    .clone()
                    .add([i, (this.size[1] / 2) * signs[1]])
                    .add([0, signs[1] < 0 ? -this.size[1] * tiles.tileWh[1] : 0])
                    .mod(tiles.tileWh)
                    .div(tiles.tileWh)
                    .mul(5)
                    .clamp(1)
                    .scale(1,-1)
                    .translate(0, 5);
                const tile = tiles.map[Point.mod(tilePos[0], tiles.wh[0])]?.[tilePos[1] + signs[1]];
                if (tile?.type > 0 && TileSpace.tileGeometry[tile.type][pos.toIndex(5)] > 0) {
                    this.vel[1] = 0;
                    if (signs[1] === -1) {
                        this.pos[1] = (Math.ceil(this.pos[1] / (tiles.tileWh[1] / 4)) * (tiles.tileWh[1] / 4));
                        this.collided = 'down';
                    } else {
                        this.pos[1] = ((Math.floor((this.pos[1] / tiles.tileWh[1]) * 5) / 5) * tiles.tileWh[1]) - Math.abs(teor);
                        this.collided = 'up';
                    }
                    break;
                }
            }
            if (this.collided === 'down' || this.collided === 'up') break;
            this.pos[1] += Math.min(distance[1], 4) * signs[1];
            distance[1] -= Math.min(distance[1], 4);
        }
        // walk forward one tile on each axis
        while (distance[0] > 0) {
            for (let i = beor; i <= teor; i++) {
                const tilePos = this.pos
                    .clone()
                    .add([(this.size[0] / 2) * signs[0], i])
                    .add([signs[0] > 0 ? Math.floor(this.size[0] * tiles.tileWh[0]) : 0, 0])
                    .div(tiles.tileWh)
                    .scale(-1, 1)
                    .translate(tiles.wh[0], 0)
                    .clamp(1);
                const pos = this.pos
                    .clone()
                    .mod(tiles.tileWh)
                    .add([(this.size[0] / 2) * signs[0], i])
                    .add([signs[0] > 0 ? Math.floor(this.size[0] * tiles.tileWh[0]) : 0, 0])
                    .div(tiles.tileWh)
                    .mul(5)
                    .clamp(1)
                    .scale(1,-1)
                    .translate(0, 5);
                const tile = tiles.map[Point.mod(tilePos[0] + signs[0], tiles.wh[0])]?.[tilePos[1]];
                if (tile?.type > 0 && TileSpace.tileGeometry[tile.type][pos] > 0) {
                    this.vel[0] = 0;
                    if (signs[0] === -1) {
                        this.pos[0] = ((Math.ceil((this.pos[0] / tiles.tileWh[0]) * 5) / 5) * tiles.tileWh[0]) + Math.abs(leor);
                        this.collided = 'left';
                    } else {
                        this.pos[0] = ((Math.floor((this.pos[0] / tiles.tileWh[0]) * 5) / 5) * tiles.tileWh[0]);
                        this.collided = 'right';
                    }
                    break;
                }
            }
            if (this.collided === 'left' || this.collided === 'right') break;
            this.pos[0] += Math.min(distance[0], 4) * signs[0];
            distance[0] -= Math.min(distance[0], 4);
        }
        neighbors.forEach(ent => {
            const le = ent.pos[0] - ((ent.size[0] / 2) * tiles.tileWh[0]);
            const re = ent.pos[0] + ((ent.size[0] / 2) * tiles.tileWh[0]);
            const te = ent.pos[1] + ((ent.size[1] / 2) * tiles.tileWh[1]);
            const be = ent.pos[1] - ((ent.size[1] / 2) * tiles.tileWh[1]);
            if (lem < re && lem > le && (tem < te || bem > be)) {
                const impulse = lem - le;
                this.vel[0] += impulse / 2;
                ent.vel[0] += -impulse / 2;
            }
            if (rem > le && rem < re && (tem < te || bem > be)) {
                const impulse = rem - re;
                this.vel[0] += impulse / 2;
                ent.vel[0] += -impulse / 2;
            }
            /*
            if (bem < te && bem > be && (lem > le || rem < re)) {
                this.collided = 'down';
                this.vel[1] = tem - te;
            }
            if (tem < be && tem > te && (lem > le || rem < re)) {
                this.collided = 'up';
                this.vel[1] = bem - be;
            }
            */
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
        const skin = this.render._allSkins[Physics.entityDatas[this.kind].skin];
        this.render.updateDrawableSkinId(this.draw, Physics.entityDatas[this.kind].skin);
        const scale = tiles.tileWh.clone().div(skin.size).mul(this.size).mul(100);
        this.render.updateDrawableScale(this.draw, scale);
        this.render.updateDrawablePosition(this.draw, this.pos.clone()
            .add(tiles.camera.pos.clone().scale(1, -1))
            .sub(tiles.tileWh)
            .rotate(tiles.camera.dir));
        this.render.updateDrawableDirection(this.draw, 180 - tiles.camera.dir);
    }
}
class Physics {
    static entityDatas = {
        error: {
            dimensions: [1,1]
        },
        player: {
            dimensions: [1,1.794449792]
        }
    }
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
    debugging = false;
    constructor(tiles, render) {
        this.render = render;
        this.tiles = tiles;
    }
    loadAssets(assets) {
        Physics.entityDatas.error.skin = this.render.createSVGSkin(assets.get('error'));
        Physics.entityDatas.player.skin = this.render.createSVGSkin(assets.get('pang'));
    }
    enableDebug() {
        const canvas = createCanvas(1,1);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'blue';
        ctx.fillRect(0,0, 1,1);
        const skin = this.render.createBitmapSkin(canvas, 1);
        for (const name in Physics.entityDatas)
            Physics.entityDatas[name].skin = skin;
        this.debugging = true;
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