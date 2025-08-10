const { keys, stringifyKey, names } = require('./key-actions.js');
const { DebuggerTiles } = require('./debuggers.js');

const keySwitches = [
    [ // row one
        0,0,
        [[.10,0, 1,.75, 'ESC', names['Escape']],
        [1.25,0, 1,.75, 'F1', names['F1']],
        [2.25,0, 1,.75, 'F2', names['F2']],
        [3.25,0, 1,.75, 'F3', names['F3']],
        [4.25,0, 1,.75, 'F4', names['F4']],
        [5.75,0, 1,.75, 'F5', names['F5']],
        [6.75,0, 1,.75, 'F6', names['F6']],
        [7.75,0, 1,.75, 'F7', names['F7']],
        [8.75,0, 1,.75, 'F8', names['F8']],
        [10.25,0, 1,.75, 'F9', names['F9']],
        [11.25,0, 1,.75, 'F10', names['F10']],
        [12.25,0, 1,.75, 'F11', names['F11']],
        [13.25,0, 1,.75, 'F12', names['F12']],
        [17,0, 1,.75, 'Pause', names['Pause']],
        [15,0, 1,.75, 'PrtScr', names['PrintScreen']],
        [16,0, 1,.75, 'Scroll', names['ScrollLock']]]
    ],
    [ // row two
        3,3,
        [[0,1, 1,1, '~\n`', names['Backquote']],
        [1,1, 1,1, '!\n1', names['1']],
        [2,1, 1,1, '@\n2', names['2']],
        [3,1, 1,1, '#\n3', names['3']],
        [4,1, 1,1, '$\n4', names['4']],
        [5,1, 1,1, '%\n5', names['5']],
        [6,1, 1,1, '^\n6', names['6']],
        [7,1, 1,1, '&\n7', names['7']],
        [8,1, 1,1, '*\n8', names['8']],
        [9,1, 1,1, '(\n9', names['9']],
        [10,1, 1,1, ')\n0', names['0']],
        [11,1, 1,1, '_\n-', names['Minus']],
        [12,1, 1,1, '+\n=', names['Equal']],
        [13,1, 2,1, '← Back\nSpace', names['Backspace']],
        [15.25,1, 1,1, 'Insert', names['Insert']],
        [16.25,1, 1,1, 'Home', names['Home']],
        [17.25,1, 1,1, 'Page\nUp', names['PageUp']],
        [18.75,1, 1,1, 'Num\nLock', names['NumLock']],
        [19.75,1, 1,1, '/', names['NumpadDivide']],
        [20.75,1, 1,1, '*', names['NumpadMultiply']],
        [21.75,1, 1,1, '-', names['NumpadSubtract']]],
    ],
    [ // third row
        7,7,
        [[0,2, 1.5,1, 'Tab', names['Tab']],
        [1.5,2, 1,1, 'Q', names['Q']],
        [2.5,2, 1,1, 'W', names['W']],
        [3.5,2, 1,1, 'E', names['E']],
        [4.5,2, 1,1, 'R', names['R']],
        [5.5,2, 1,1, 'T', names['T']],
        [6.5,2, 1,1, 'Y', names['Y']],
        [7.5,2, 1,1, 'U', names['U']],
        [8.5,2, 1,1, 'I', names['I']],
        [9.5,2, 1,1, 'O', names['O']],
        [10.5,2, 1,1, 'P', names['P']],
        [11.5,2, 1,1, '{\n[', names['LeftBracket']],
        [12.5,2, 1,1, '}\n]', names['RightBracket']],
        [13.5,2, 1.5,1, '|\n\\', names['Backslash']],
        [16.5,2, 1,1, 'End', names['End']],
        [15.5,2, 1,1, 'Delete', names['Delete']],
        [17.5,2, 1,1, 'Page\nDown', names['PageDown']],
        [19,2, 1,1, '7\nHome', names['Numpad7']],
        [20,2, 1,1, '8\n↑', names['Numpad8']],
        [21,2, 1,1, '9\nPgUp', names['Numpad9']],
        [22,2, 1,1, '+', names['NumpadAdd']]],
    ],
    [ // fourth row
        6,8,
        [[0,3, 1.75,1, 'Caps Lock', names['CapsLock']],
        [1.75,3, 1,1, 'A', names['A']],
        [2.75,3, 1,1, 'S', names['S']],
        [3.75,3, 1,1, 'D', names['D']],
        [4.75,3, 1,1, 'F', names['F']],
        [5.75,3, 1,1, 'G', names['G']],
        [6.75,3, 1,1, 'H', names['H']],
        [7.75,3, 1,1, 'J', names['J']],
        [8.75,3, 1,1, 'K', names['K']],
        [9.75,3, 1,1, 'L', names['L']],
        [10.75,3, 1,1, ':\n;', names['Semicolon']],
        [11.75,3, 1,1, '"\n\'', names['Apostrophe']],
        [12.75,3, 2.25,1, 'Enter ↵', names['NumpadEnter']],
        [20.25,3, 1,1, '5\n', names['Numpad5']],
        [19.25,3, 1,1, '4\n←', names['Numpad4']],
        [21.25,3, 1,1, '6\n→', names['Numpad6']]],
    ],
    [ // fifth row
        3,3,
        [[0,4, 2.5,1, 'Shift', names['ShiftLeft']],
        [2.5,4, 1,1, 'Z', names['Z']],
        [3.5,4, 1,1, 'X', names['X']],
        [4.5,4, 1,1, 'C', names['C']],
        [5.5,4, 1,1, 'V', names['V']],
        [6.5,4, 1,1, 'B', names['B']],
        [7.5,4, 1,1, 'N', names['N']],
        [8.5,4, 1,1, 'M', names['M']],
        [9.5,4, 1,1, '<\n,', names['Comma']],
        [10.5,4, 1,1, '>\n.', names['Period']],
        [11.5,4, 1,1, '?\n/', names['Slash']],
        [12.5,4, 2.5,1, 'Shift', names['ShiftRight']],
        [16.25,4, 1,1, '↑', names['ArrowUp']],
        [19.5,4, 1,1, '1\nEnd', names['Numpad1']],
        [20.5,4, 1,1, '2\n↓', names['Numpad2']],
        [21.5,4, 1,1, '3\nPgDn', names['Numpad3']],
        [22.5,4, 1,1, 'Enter', names['Enter']]],
    ],
    [ // sixth row
        0,0,
        [[0,5, 1.5,1, 'Ctrl', names['ControlLeft']],
        [1.5,5, 1.25,1, '⌘', names['MetaLeft']], // meta key, or windows key, or whatever mac calls it
        [2.75,5, 1.5,1, 'Alt', names['AltLeft']],
        [4.25,5, 5.75,1, '', names['Space']],
        [10,5, 1.25,1, 'Alt', names['AltRight']],
        [11.25,5, 1.25,1, '⌘', names['MetaRight']],
        [12.5,5, 1.25,1, '☰', names['ContextMenu']],
        [13.75,5, 1.25,1, 'Ctrl', names['ControlRight']],
        [15.5,5, 1,1, '←', names['ArrowRight']],
        [16.5,5, 1,1, '↓', names['ArrowDown']],
        [17.5,5, 1,1, '→', names['ArrowLeft']],
        [19.5,5, 2.25,1, '0\nInsert', names['Numpad0']],
        [21.75,5, 1,1, '.\nDel', names['NumpadDecimal']]],
    ],
];
class Settings {
    /** @type {import('./renderer/src/RenderWebGL.js')} */
    render = null;
    /** @type {import('glfw-raub').Window} */
    window = null;
    /** @type {DebuggerTiles} */
    tiles = null;
    constructor(render, window) {
        this.render = render;
        this.window = window;
        this.tiles = new DebuggerTiles(this.window.width, this.window.height, 'settings', this.render, window, {});
        this.tiles.direction = 'down';
        this.tiles.alignmentColumn = 'center';
        this.tiles.alignmentRow = 'center';
        this.tiles.createTile(/** @param {import('canvas').CanvasRenderingContext2D} ctx */ function(ctx) {
            if (this.done) return true;
            this.done = true;

            ctx.resetTransform();
            ctx.clearRect(0,0, this.width, this.height);
            ctx.fillStyle = '#0000007F';
            ctx.fillRect(0,0, this.width, this.height);
            ctx.scale(1, -1);
            ctx.translate(this.width / 2, -this.height / 2);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.textBaseline = 'middle'

            function createRoundRect(x,y, w,h, rad) {
                const bottomLeft = [x,y];
                const bottomRight = [x + w, y];
                const topLeft = [x, y + h];
                const topRight = [x + w, y + h];
                const bottom = [x + (w / 2), y];
                const top = [x + (w / 2), y + h];
                const left = [x, y + (h / 2)];
                const right = [x + w, y + (h / 2)];
                ctx.beginPath();
                ctx.moveTo(...bottom);
                ctx.arcTo(...bottomLeft, ...left, rad);
                ctx.arcTo(...topLeft, ...top, rad);
                ctx.arcTo(...topRight, ...right, rad);
                ctx.arcTo(...bottomRight, ...bottom, rad);
                ctx.closePath();
            }
            createRoundRect(-449.5,-117, 899,234, 8);
            ctx.stroke();
        }, this.window.width, this.window.height);
        let labelsUp = true;
        let leftList = true;
        let nameRowTopLeft = 0;
        let nameRowTopRight = 0;
        let nameRowBottomLeft = 0;
        let nameRowBottomRight = 0;
        const drawKey = (x,y, w,h, label, filled, name = 'no name') => {
            x *= 38;
            y *= 38;
            x += -443.5;
            y += -111;
            w *= 38;
            h *= 38;
            w -= 6;
            h -= 6;
            const nameRow = labelsUp
                ? leftList
                    ? nameRowTopLeft++
                    : nameRowTopRight++
                : leftList
                    ? nameRowBottomLeft++
                    : nameRowBottomRight++;
            const height = Math.abs(labelsUp 
                ? (((-117 - y) + y) - 4) - (nameRow * 11)
                : (117 - (y + h)) + (y + h) + 4 + (nameRow * 11));
            if (labelsUp) y -= height;
            const isUp = labelsUp;
            this.tiles.createTile(function(ctx) {
                if (this.done) return true;
                this.done = true;
                this.y = -y;
                ctx.resetTransform();
                ctx.clearRect(0,0, this.width, this.height);
                ctx.scale(1, -1);
                ctx.translate(0, -this.height);
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1;
                ctx.textBaseline = 'middle';
                const drawY = isUp ? this.height - h : 0;

                function createRoundRect(x,y, w,h, rad) {
                    x += 1;
                    y += 1;
                    w -= 2;
                    h -= 2;
                    const bottomLeft = [x,y];
                    const bottomRight = [x + w, y];
                    const topLeft = [x, y + h];
                    const topRight = [x + w, y + h];
                    const bottom = [x + (w / 2), y];
                    const top = [x + (w / 2), y + h];
                    const left = [x, y + (h / 2)];
                    const right = [x + w, y + (h / 2)];
                    ctx.beginPath();
                    ctx.moveTo(...bottom);
                    ctx.arcTo(...bottomLeft, ...left, rad);
                    ctx.arcTo(...topLeft, ...top, rad);
                    ctx.arcTo(...topRight, ...right, rad);
                    ctx.arcTo(...bottomRight, ...bottom, rad);
                    ctx.closePath();
                }
                ctx.lineWidth = 2;
                ctx.fillStyle = 'black';
                ctx.strokeStyle = 'white';
                ctx.textAlign = 'left';
                createRoundRect(0,drawY, w,h, 6);
                ctx.stroke();
                ctx.fill();
                if (filled) {
                    createRoundRect(3,drawY +3, w -6,h -6, 4);
                    ctx.stroke();
                }
                if (filled) ctx.fillStyle = 'white';
                else ctx.fillStyle = '#FFFFFF80';
                const measures = ctx.measureText('`1234567890-=qwertyuiop[]\\asdfghjkl;\'zxcvbnm,./');
                const lineHeight = measures.actualBoundingBoxAscent + measures.actualBoundingBoxDescent;
                const height = (label.split('\n').length -1) * lineHeight;
                let textY = drawY + ((h - height) / 2);
                for (const line of label.split('\n')) {
                    const measures = ctx.measureText(line);
                    ctx.fillText(line, ((w - Math.min(measures.width, w -6)) / 2), textY, w - 6);
                    textY += height;
                }
                if (filled) {
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = '#ffffff80';
                    if (leftList) ctx.textAlign = 'right';
                    else ctx.textAlign = 'left';
                    ctx.beginPath();
                    let endPoint = [];
                    if (isUp) {
                        const nameY = nameRow * lineHeight;
                        ctx.moveTo((w / 2), 0);
                        endPoint = [(w / 2), (((-117 - drawY) + drawY) - 4) - nameY];
                        ctx.lineTo(...endPoint);
                        ctx.arcTo(endPoint[0], endPoint[1] - 4, endPoint[0] += leftList ? -4 : 4, endPoint[1] -= 4, 4);
                        ctx.translate(...endPoint);
                        ctx.rotate((-0 / 180) * Math.PI);
                        ctx.fillText(name, 0, 0);
                        ctx.rotate((0 / 180) * Math.PI);
                        ctx.translate(-endPoint[0], -endPoint[1]);
                    } else {
                        const nameY = nameRow * lineHeight;
                        ctx.moveTo((w / 2), h);
                        endPoint = [(w / 2), (117 - (h + drawY)) + (h + drawY) + 4 + nameY];
                        ctx.lineTo(...endPoint);
                        ctx.arcTo(endPoint[0], endPoint[1] + 4, endPoint[0] += leftList ? -4 : 4, endPoint[1] += 4, 4);
                        ctx.translate(...endPoint);
                        ctx.rotate((0 / 180) * Math.PI);
                        ctx.fillText(name, 0, 0);
                        ctx.rotate((-0 / 180) * Math.PI);
                        ctx.translate(-endPoint[0], -endPoint[1]);
                    }
                    ctx.stroke();
                }
            }, w,height, '', x,-y);
        }
        labelsUp = true;
        for (let i = 0; i < keySwitches.length / 2; i++) {
            const row = keySwitches[i];
            nameRowTopLeft = row[0];
            nameRowTopRight = row[1];
            leftList = true;
            for (let j = 0; j < row[2].length / 2; j++)
                drawKey(row[2][j][0], row[2][j][1], row[2][j][2], row[2][j][3], row[2][j][4], 
                    Object.entries(keys)
                        .some(item => item[1][0].includes(row[2][j][5])),
                    Object.entries(keys)
                        .filter(item => item[1][0].includes(row[2][j][5]))
                        .map(item => item[0])
                        .join(', ')
                );
            leftList = false;
            for (let j = row[2].length -1; j >= row[2].length / 2; j--)
                drawKey(row[2][j][0], row[2][j][1], row[2][j][2], row[2][j][3], row[2][j][4], 
                    Object.entries(keys)
                        .some(item => item[1][0].includes(row[2][j][5])),
                    Object.entries(keys)
                        .filter(item => item[1][0].includes(row[2][j][5]))
                        .map(item => item[0])
                        .join(', ')
                );
        }
        labelsUp = false;
        for (let i = keySwitches.length -1; i >= keySwitches.length / 2; i--) {
            const row = keySwitches[i];
            nameRowBottomLeft = row[0];
            nameRowBottomRight = row[1];
            leftList = true;
            for (let j = 0; j < row[2].length / 2; j++)
                drawKey(row[2][j][0], row[2][j][1], row[2][j][2], row[2][j][3], row[2][j][4], 
                    Object.entries(keys)
                        .some(item => item[1][0].includes(row[2][j][5])),
                    Object.entries(keys)
                        .filter(item => item[1][0].includes(row[2][j][5]))
                        .map(item => item[0])
                        .join(', ')
                );
            leftList = false;
            for (let j = row[2].length -1; j >= row[2].length / 2; j--)
                drawKey(row[2][j][0], row[2][j][1], row[2][j][2], row[2][j][3], row[2][j][4], 
                    Object.entries(keys)
                        .some(item => item[1][0].includes(row[2][j][5])),
                    Object.entries(keys)
                        .filter(item => item[1][0].includes(row[2][j][5]))
                        .map(item => item[0])
                        .join(', ')
                );
        }
        this.tiles.resetPositions();
    }
    draw() { this.tiles.renderTiles(); }
    fireClicks() { this.tiles.fireClicks(); }
}
module.exports = Settings;