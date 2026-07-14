const { Canvas } = require('canvas');

class InnerWindow {
    /** @type {import('./text-layer')} */
    text = null;
    /** @type {string} */
    title = 'Bad Window';
    x = 0;
    y = 0;
    width = 40;
    height = 40;
    /** @type {() => import('canvas').Canvas?} */
    ondraw = null;
    constructor(text, title) {
        this.text = text;
        this.title = title;
    }
    draw() {
        this.text.fill = '#212121';
        this.text.stroke = '#FFF';
        this.text.moveTo(this.x, this.y);
        this.text.text(this.title.padEnd(this.width -1) + '$fill(#2a2a2a)X');
        this.text.rect(this.x, this.y, this.width, this.height +1);
        const output = this.ondraw(this.x, this.y +1, this.width, this.height);
        if (output instanceof Canvas)
            this.text.image(output, this.x, this.y +1, this.width, this.height);
    }


        // drawWindowHeader() {
        //     this.topStart = 0;
        //     if (this.showTopBar) {
        //         this.text.fill = '#212121';
        //         this.text.stroke = '#FFF';
        //         const title = this.window.title
        //             .padStart(this.text.size[0] / 2)
        //             .padEnd(this.text.size[0]);
        //         this.text.moveTo((this.text.size[0] - title.length) / 2, 0);
        //         this.text.text(
        //             ' '.repeat(this.text.size[0]) + '\n' +
        //             title + '\n' +
        //             ' '.repeat(this.text.size[0])
        //         );
        //         this.topStart = this.text.cursor[1] +1;
    
        //         this.text.fill = '#2a2a2a';
        //         this.text.rect(this.text.size[0] - this.topStart, -1, this.topStart, this.topStart);
        //         this.text.rect(this.text.size[0] - (this.topStart * 2), -1, this.topStart, this.topStart);
        //         this.text.rect(this.text.size[0] - (this.topStart * 3), -1, this.topStart, this.topStart);
        //         const height = (this.topStart * TextLayer.tileSize[1]);
        //         if (this.window.cursorPos.y < height) {
        //             this.text.fill = '#393939';
        //             if (this.window.cursorPos.x > (this.window.width - height)) {
        //                 this.text.fill = '#823838';
        //                 this.text.rect(this.text.size[0] - this.topStart, -1, this.topStart, this.topStart);
        //                 if (this.window.getMouseButton(0)) process.exit();
        //             } else if (this.window.cursorPos.x > (this.window.width - (height * 2))) {
        //                 this.text.rect(this.text.size[0] - (this.topStart * 2), -1, this.topStart, this.topStart);
        //                 if (this.window.getMouseButton(0)) this.window.mode = this.window.mode === 'fullscreen' 
        //                     ? 'windowed' 
        //                     : 'fullscreen';
        //             } else if (this.window.cursorPos.x > (this.window.width - (height * 3))) {
        //                 this.text.rect(this.text.size[0] - (this.topStart * 3), -1, this.topStart, this.topStart);
        //                 if (this.window.getMouseButton(0)) this.window.iconify();
        //             }
        //         }
        //         this.text.moveTo((this.text.size[0] - (this.topStart / 2)), 1);
        //         this.text.text('X');
        //         this.text.moveTo((this.text.size[0] - ((this.topStart / 2) + this.topStart)), 1);
        //         this.text.text(this.window.mode === 'fullscreen' ? '\x81' : '\x7F');
        //         this.text.moveTo((this.text.size[0] - ((this.topStart / 2) + (this.topStart * 2))), 1);
        //         this.text.text('\xEF');
    
        //         let str = ' 0123456789abcdef\n';
        //         for (let y = 0; y < 16; y++) {
        //             str += y.toString(16);
        //             for (let x = 0; x < 16; x++) {
        //                 str += String.fromCharCode((y << 4) | x);
        //             }
        //             str += '\n';
        //         }
        //         this.text.text(str, new Point(40, 20));
        //     }
        // }
}

module.exports = InnerWindow;