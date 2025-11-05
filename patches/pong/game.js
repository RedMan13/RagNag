const { createCanvas, ImageData } = require('canvas');
const Point = require('./point.js');
const { keys, names, stringifyKey, handleKeys } = require('./key-actions.js');

class Pong {
    /** 
     * @param {import('./renderer/src/RenderWebGL')} render 
     * @param {import('glfw-raub').Window} window 
     */
    constructor(render, window) {
        this.render = render;
        this.window = window;
        const dit = new ImageData(1,1);
        dit.data.fill(255);
        this.dit = render.createBitmapSkin(dit, 1);
        this.padleA = render.createDrawable('gui');
        render.updateDrawableSkinId(this.padleA, this.dit);
        render.updateDrawableScale(this.padleA, [1000, 6000]);
        render.updateDrawablePosition(this.padleA, [(-window.width / 2) + 20, 0]);
        this.padleB = render.createDrawable('gui');
        render.updateDrawableSkinId(this.padleB, this.dit);
        render.updateDrawableScale(this.padleB, [1000, 6000]);
        render.updateDrawablePosition(this.padleB, [(window.width / 2) - 20, 0]);
        this.aiPos = 0;
        this.ball = render.createDrawable('gui');
        render.updateDrawableSkinId(this.ball, this.dit);
        render.updateDrawableScale(this.ball, [1000, 1000]);
        this.textCan = createCanvas(256, 64);
        this.textCtx = this.textCan.getContext('2d');
        this.textSkin = render.createBitmapSkin(this.textCan, 1, [this.textCan.width / 2, 0]);
        this.textDraw = render.createDrawable('gui');
        render.updateDrawableSkinId(this.textDraw, this.textSkin);
        render.updateDrawablePosition(this.textDraw, [0, window.height / 2]);

        this.scoreA = 0;
        this.scoreB = 0;
        this.ballSpeed = 3;
        this.ballPos = new Point(0,0);
        this.ballDir = (Math.random() * 360) - 128;
        this.playing = false;

        keys['Start Pong'] = [[names.Space], true, () => this.playing = true, 'Starts a game of pong, when its open of course'];
    }
    drawScore() {
        let y = 0;
        this.textCtx.textAlign = 'center';
        this.textCtx.resetTransform();
        this.textCtx.clearRect(0,0, this.textCan.width, this.textCan.height);
        this.textCtx.scale(1, -1);
        this.textCtx.translate(0, -this.textCan.height);
        this.textCtx.fillStyle = 'white';
        this.textCtx.strokeStyle = 'black';
        this.textCtx.lineWidth = 1;
        this.textCtx.font = '20px';
        const center = this.textCan.width / 2;
        const scoreTxt = `${this.scoreA}:${this.scoreB}`;
        this.textCtx.strokeText(scoreTxt, center,y += 17);
        this.textCtx.fillText(scoreTxt, center,y);
        if (!this.playing) {
            const messageTxt = `Press ${stringifyKey('Start Pong')} key to begin`;
            this.textCtx.strokeText(messageTxt, center,y += 17);
            this.textCtx.fillText(messageTxt, center,y);
        }
        this.render.updateBitmapSkin(this.textSkin, this.textCan, 1, [this.textCan.width / 2, 0]);
        this.render.updateDrawablePosition(this.textDraw, [0, window.height / 2]);
    }
    tick() {
        this.drawScore();
        this.render.updateDrawablePosition(this.padleA, [(-this.window.width / 2) + 20, (this.window.height / 2) - this.window.cursorPos.y]);
        this.render.draw();
        handleKeys(this.window);
        if (!this.playing) return;
        if (this.ballPos[1] >= ((this.window.height / 2) - 10) || this.ballPos[1] <= ((-this.window.height / 2) + 10))
            this.ballDir = -this.ballDir + 180;
        if (this.render.isTouchingDrawables(this.ball, [this.padleA, this.padleB])) {
            let res;
            if (this.ballPos[0] < 0)
                res = ((Math.atan2(this.ballPos[1] - ((this.window.height / 2) - this.window.cursorPos.y), this.ballPos[0] - ((-this.window.width / 2) + 20)) / Math.PI) * 180) -90;
            else 
                res = ((Math.atan2(0, this.ballPos[0] - ((-this.window.width / 2) - 20)) / Math.PI) * 180) +90;
            this.ballDir = Math.abs(Math.abs(res) - 90) < 1 ? -this.ballDir : res;
            this.ballSpeed++;
        }
        this.aiPos = this.ballPos[1];
        this.render.updateDrawablePosition(this.padleB, [(window.width / 2) - 20, this.aiPos]);
        this.ballPos.add(new Point(this.ballSpeed,0).rotate(this.ballDir));
        if (this.ballPos[0] <= ((-this.window.width / 2) - 10)) {
            this.scoreB++;
            this.playing = false;
            this.ballDir = (Math.random() * 360) - 128;
            this.ballPos.set(0,0);
        }
        if (this.ballPos[0] >= ((this.window.width / 2) + 10)) {
            this.scoreA++;
            this.playing = false;
            this.ballDir = (Math.random() * 360) - 128;
            this.ballPos.set(0,0);
        }
        this.render.updateDrawablePosition(this.ball, this.ballPos);
    }
}

module.exports = Pong;