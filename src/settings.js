const { keys, stringifyKey, names } = require('./key-actions.js');
const Point = require('./point.js');
const TextLayer = require('./text-layer.js');

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
        [13.25,0, 1,.75, 'F12', names['F12']]],
    ],
    [ // row two
        3,1,
        [[.60,.75, 1,.75, 'F13', names['F13']],
        [1.75,.75, 1,.75, 'F14', names['F14']],
        [2.75,.75, 1,.75, 'F15', names['F15']],
        [3.75,.75, 1,.75, 'F16', names['F16']],
        [4.75,.75, 1,.75, 'F17', names['F17']],
        [6.375,.75, 1,.75, 'F18', names['F18']],
        [7.375,.75, 1,.75, 'F19', names['F19']],
        [8.375,.75, 1,.75, 'F20', names['F20']],
        [9.375,.75, 1,.75, 'F21', names['F21']],
        [11,.75, 1,.75, 'F22', names['F22']],
        [12,.75, 1,.75, 'F23', names['F23']],
        [13,.75, 1,.75, 'F24', names['F24']],
        [14,.75, 1,.75, 'F25', names['F25']],
        [17,.75, 1,.75, 'Pause', names['Pause']],
        [15,.75, 1,.75, 'PrtScr', names['PrintScreen']],
        [16,.75, 1,.75, 'Scroll', names['ScrollLock']]]
    ],
    [ // row three
        6,2,
        [[0,2, 1,1, '~\n`', names['Backquote']],
        [1,2, 1,1, '!\n1', names['1']],
        [2,2, 1,1, '@\n2', names['2']],
        [3,2, 1,1, '#\n3', names['3']],
        [4,2, 1,1, '$\n4', names['4']],
        [5,2, 1,1, '%\n5', names['5']],
        [6,2, 1,1, '^\n6', names['6']],
        [7,2, 1,1, '&\n7', names['7']],
        [8,2, 1,1, '*\n8', names['8']],
        [9,2, 1,1, '(\n9', names['9']],
        [10,2, 1,1, ')\n0', names['0']],
        [11,2, 1,1, '_\n-', names['Minus']],
        [12,2, 1,1, '+\n=', names['Equal']],
        [13,2, 2,1, '\xEB Back\nSpace', names['Backspace']],
        [15.25,2, 1,1, 'Insert', names['Insert']],
        [16.25,2, 1,1, 'Home', names['Home']],
        [17.25,2, 1,1, 'Page\nUp', names['PageUp']],
        [18.75,2, 1,1, 'Num\nLock', names['NumLock']],
        [19.75,2, 1,1, '/', names['NumpadDivide']],
        [20.75,2, 1,1, '*', names['NumpadMultiply']],
        [21.75,2, 1,1, '-', names['NumpadSubtract']]],
    ],
    [ // row four
        9,5,
        [[0,3, 1.5,1, 'Tab', names['Tab']],
        [1.5,3, 1,1, 'Q', names['Q']],
        [2.5,3, 1,1, 'W', names['W']],
        [3.5,3, 1,1, 'E', names['E']],
        [4.5,3, 1,1, 'R', names['R']],
        [5.5,3, 1,1, 'T', names['T']],
        [6.5,3, 1,1, 'Y', names['Y']],
        [7.5,3, 1,1, 'U', names['U']],
        [8.5,3, 1,1, 'I', names['I']],
        [9.5,3, 1,1, 'O', names['O']],
        [10.5,3, 1,1, 'P', names['P']],
        [11.5,3, 1,1, '{\n[', names['LeftBracket']],
        [12.5,3, 1,1, '}\n]', names['RightBracket']],
        [13.5,3, 1.5,1, '|\n\\', names['Backslash']],
        [16.5,3, 1,1, 'End', names['End']],
        [15.5,3, 1,1, 'Delete', names['Delete']],
        [17.5,3, 1,1, 'Page\nDown', names['PageDown']],
        [19,3, 1,1, '7\nHome', names['Numpad7']],
        [20,3, 1,1, '8\n\xE9', names['Numpad8']],
        [21,3, 1,1, '9\nPgUp', names['Numpad9']],
        [22,3, 1,2, '+', names['NumpadAdd']]],
    ],
    [ // row five
        6,8,
        [[0,4, 1.75,1, 'Caps Lock', names['CapsLock']],
        [1.75,4, 1,1, 'A', names['A']],
        [2.75,4, 1,1, 'S', names['S']],
        [3.75,4, 1,1, 'D', names['D']],
        [4.75,4, 1,1, 'F', names['F']],
        [5.75,4, 1,1, 'G', names['G']],
        [6.75,4, 1,1, 'H', names['H']],
        [7.75,4, 1,1, 'J', names['J']],
        [8.75,4, 1,1, 'K', names['K']],
        [9.75,4, 1,1, 'L', names['L']],
        [10.75,4, 1,1, ':\n;', names['Semicolon']],
        [11.75,4, 1,1, '"\n\'', names['Apostrophe']],
        [12.75,4, 2.25,1, 'Enter \xEB\xDF', names['Enter']],
        [19,4, 1,1, '4\n\xEB', names['Numpad4']],
        [20,4, 1,1, '5\n', names['Numpad5']],
        [21,4, 1,1, '6\n\xEA', names['Numpad6']]],
    ],
    [ // row six
        3,3,
        [[0,5, 2.5,1, 'Shift', names['ShiftLeft']],
        [2.5,5, 1,1, 'Z', names['Z']],
        [3.5,5, 1,1, 'X', names['X']],
        [4.5,5, 1,1, 'C', names['C']],
        [5.5,5, 1,1, 'V', names['V']],
        [6.5,5, 1,1, 'B', names['B']],
        [7.5,5, 1,1, 'N', names['N']],
        [8.5,5, 1,1, 'M', names['M']],
        [9.5,5, 1,1, '<\n,', names['Comma']],
        [10.5,5, 1,1, '>\n.', names['Period']],
        [11.5,5, 1,1, '?\n/', names['Slash']],
        [12.5,5, 2.5,1, 'Shift', names['ShiftRight']],
        [16.25,5, 1,1, '\xE9', names['ArrowUp']],
        [19.25,5, 1,1, '1\nEnd', names['Numpad1']],
        [20.25,5, 1,1, '2\n\xE8', names['Numpad2']],
        [21.25,5, 1,1, '3\nPgDn', names['Numpad3']],
        [22.25,5, 1,1, 'Enter', names['NumpadEnter']]],
    ],
    [ // row seven
        0,0,
        [[0,6, 1.5,1, 'Ctrl', names['ControlLeft']],
        [1.5,6, 1.25,1, '\x8F', names['MetaLeft']], // meta key, or windows key, or whatever mac calls it
        [2.75,6, 1.5,1, 'Alt', names['AltLeft']],
        [4.25,6, 5.75,1, '', names['Space']],
        [10,6, 1.25,1, 'Alt', names['AltRight']],
        [11.25,6, 1.25,1, '\x8F', names['MetaRight']],
        [12.5,6, 1.25,1, '\x90', names['ContextMenu']],
        [13.75,6, 1.25,1, 'Ctrl', names['ControlRight']],
        [15.5,6, 1,1, '\xEB', names['ArrowLeft']],
        [16.5,6, 1,1, '\xE8', names['ArrowDown']],
        [17.5,6, 1,1, '\xEA', names['ArrowRight']],
        [19.25,6, 2.25,1, '0\nInsert', names['Numpad0']],
        [21.5,6, 1,1, '.\nDel', names['NumpadDecimal']],
        [22.5,6, 1,1, '=', names['NumpadEqual']]],
    ],
];
class Settings {
    /** @type {import('glfw-raub').Window} */
    window = null;
    /** @type {import('./text-layer.js')} */
    text = null;
    /** @type {DebuggerTiles} */
    tiles = null;
    constructor(text, window) {
        this.text = text;
        this.window = window;
        this.draw();
    }
    draw() {
        this.text.clearAll();
        this.labelsUp = true;
        this.leftList = true;
        this.nameRowTopLeft = 0;
        this.nameRowTopRight = 0;
        this.nameRowBottomLeft = 0;
        this.nameRowBottomRight = 0;
        this.labelsUp = true;
        this.linePoses = [];
        for (let i = 0; i < keySwitches.length / 2; i++) {
            const row = keySwitches[i];
            this.nameRowTopLeft = row[0];
            this.nameRowTopRight = row[1];
            this.leftList = true;
            for (let j = 0; j < row[2].length / 2; j++)
                this.drawKey(row[2][j][0], row[2][j][1], row[2][j][2], row[2][j][3], row[2][j][4], row[2][j][5], 
                    Object.entries(keys)
                        .some(item => item[1][0].includes(row[2][j][5])),
                    Object.entries(keys)
                        .filter(item => item[1][0].includes(row[2][j][5]))
                        .map(item => item[0])
                        .join(', ')
                );
            this.leftList = false;
            for (let j = row[2].length -1; j >= row[2].length / 2; j--)
                this.drawKey(row[2][j][0], row[2][j][1], row[2][j][2], row[2][j][3], row[2][j][4], row[2][j][5], 
                    Object.entries(keys)
                        .some(item => item[1][0].includes(row[2][j][5])),
                    Object.entries(keys)
                        .filter(item => item[1][0].includes(row[2][j][5]))
                        .map(item => item[0])
                        .join(', ')
                );
        }
        // tack on the mouse
        this.drawKey(24.5, 0, 1.5,2, 'L', names['MouseLeft'],
            Object.entries(keys)
                .some(item => item[1][0].includes(names['MouseLeft'])),
            Object.entries(keys)
                .filter(item => item[1][0].includes(names['MouseLeft']))
                .map(item => item[0])
                .join(', ')
        );
        this.drawKey(26, 0, .5,2, 'M', names['MouseMiddle'],
            Object.entries(keys)
                .some(item => item[1][0].includes(names['MouseMiddle'])),
            Object.entries(keys)
                .filter(item => item[1][0].includes(names['MouseMiddle']))
                .map(item => item[0])
                .join(', ')
        );
        this.drawKey(26.5, 0, 1.5,2, 'R', names['MouseRight'],
            Object.entries(keys)
                .some(item => item[1][0].includes(names['MouseRight'])),
            Object.entries(keys)
                .filter(item => item[1][0].includes(names['MouseRight']))
                .map(item => item[0])
                .join(', ')
        );
        this.drawKey(24.5, 2, 3.5,3, '', names['MouseRight'], false);
        this.drawKey(27.84, 2.6, .32,2.4, '', names['MouseRight'], false);
        this.drawKey(28, 3.2, .32,1.8, '', names['MouseRight'], false);
        this.drawKey(28.16, 3.8, .34,1.2, '', names['MouseRight'], false);
        this.drawKey(28.34, 4.4, .34,.6, '', names['MouseRight'], false);
        this.drawKey(28, 2, .31,.6, '4', names['Mouse4'],
            Object.entries(keys)
                .some(item => item[1][0].includes(names['Mouse4'])),
            Object.entries(keys)
                .filter(item => item[1][0].includes(names['Mouse4']))
                .map(item => item[0])
                .join(', ')
        );
        this.drawKey(28.18, 2.6, .31,.6, '5', names['Mouse5'],
            Object.entries(keys)
                .some(item => item[1][0].includes(names['Mouse5'])),
            Object.entries(keys)
                .filter(item => item[1][0].includes(names['Mouse5']))
                .map(item => item[0])
                .join(', ')
        );
        this.drawKey(28.36, 3.2, .31,.6, '6', names['Mouse6'],
            Object.entries(keys)
                .some(item => item[1][0].includes(names['Mouse6'])),
            Object.entries(keys)
                .filter(item => item[1][0].includes(names['Mouse6']))
                .map(item => item[0])
                .join(', ')
        );
        this.drawKey(28.55, 3.8, .31,.6, '7', names['Mouse7'],
            Object.entries(keys)
                .some(item => item[1][0].includes(names['Mouse7'])),
            Object.entries(keys)
                .filter(item => item[1][0].includes(names['Mouse7']))
                .map(item => item[0])
                .join(', ')
        );
        this.drawKey(28.73, 4.4, .31,.6, '8', names['Mouse8'],
            Object.entries(keys)
                .some(item => item[1][0].includes(names['Mouse8'])),
            Object.entries(keys)
                .filter(item => item[1][0].includes(names['Mouse8']))
                .map(item => item[0])
                .join(', ')
        );
        this.labelsUp = false;
        for (let i = keySwitches.length -1; i >= keySwitches.length / 2; i--) {
            const row = keySwitches[i];
            this.nameRowBottomLeft = row[0];
            this.nameRowBottomRight = row[1];
            this.leftList = true;
            for (let j = 0; j < row[2].length / 2; j++)
                this.drawKey(row[2][j][0], row[2][j][1], row[2][j][2], row[2][j][3], row[2][j][4], row[2][j][5], 
                    Object.entries(keys)
                        .some(item => item[1][0].includes(row[2][j][5])),
                    Object.entries(keys)
                        .filter(item => item[1][0].includes(row[2][j][5]))
                        .map(item => item[0])
                        .join(', ')
                );
            this.leftList = false;
            for (let j = row[2].length -1; j >= row[2].length / 2; j--)
                this.drawKey(row[2][j][0], row[2][j][1], row[2][j][2], row[2][j][3], row[2][j][4], row[2][j][5], 
                    Object.entries(keys)
                        .some(item => item[1][0].includes(row[2][j][5])),
                    Object.entries(keys)
                        .filter(item => item[1][0].includes(row[2][j][5]))
                        .map(item => item[0])
                        .join(', ')
                );
        }
    }
    drawKey(x,y, w,h, label, code, filled, name = 'no name') {
        x *= 38;
        y *= 38;
        x /= TextLayer.tileSize[0];
        y /= TextLayer.tileSize[1];
        x += (this.text.size[0] / 2) - 88.66;
        y += (this.text.size[1] / 2) - 19;
        w *= 38;
        h *= 38;
        w -= 6;
        h -= 6;
        w /= TextLayer.tileSize[0];
        h /= TextLayer.tileSize[1];
        const textWidth = label.split('\n').reduce((c,v) => Math.max(c, v.length), 0);
        const textPos = new Point((x + (w / 2)) - (textWidth / 2), y + (h / 2));
        this.text.fill = filled ? '#EEE8' : '#9998';
        this.text.strokeWidth = 0;
        this.text.rect(x,y, w,h);
        this.text.stroke = '#EEEF';
        this.text.text(label, textPos);
        this.text.fill = '#0000';
        this.text.strokeWidth = 1;
        this.text.stroke = '#EEEA';
        if (filled) {
            const xPos = Math.floor((x + (w / 2)) * TextLayer.tileSize[0]) / TextLayer.tileSize[0];
            const nameWidth = name.split('\n').reduce((c,v) => Math.max(c, v.length), 0);
            const lines = name.split('\n').length;
            if (this.labelsUp) {
                let yPos = -lines;
                for (let i = 0; i < this.linePoses.length; i++) {
                    const pos = this.linePoses[i];
                    if ((pos[1] >= yPos && pos[1] <= (yPos + lines)) || 
                        ((pos[1] + pos[3]) >= yPos && (pos[1] + pos[3]) <= (yPos + lines)) ||
                        (yPos >= pos[1] && yPos <= (pos[1] + pos[3])) || 
                        ((yPos + lines) >= pos[1] && (yPos + lines) <= (pos[1] + pos[3]))) {
                        if ((pos[0]           >= xPos && pos[0]            <= (xPos + nameWidth)) ||
                            ((pos[0] + pos[2]) >= xPos && (pos[0] + pos[2]) <= (xPos + nameWidth)) ||
                            (xPos              >= pos[0] && xPos               <= (pos[0] + pos[2])) ||
                            ((xPos + nameWidth) >= pos[0] && (xPos + nameWidth) <= (pos[0] + pos[2])))
                            yPos -= lines;
                    }
                }
                this.linePoses.push([xPos + (2 / TextLayer.tileSize[0]),yPos,nameWidth,lines]);
                yPos += (this.text.size[1] / 2) - 19;
                this.text.line(xPos, y, xPos, yPos);
                this.text.stroke = '#EEEF';
                this.text.text(name, new Point(xPos + (2 / TextLayer.tileSize[0]), yPos));
            } else {
                let yPos = lines;
                for (let i = 0; i < this.linePoses.length; i++) {
                    const pos = this.linePoses[i];
                    if (((pos[1] >= yPos && pos[1] <= (yPos + lines)) || 
                        ((pos[1] + pos[3]) >= yPos && (pos[1] + pos[3]) <= (yPos + lines))) ||
                        ((yPos >= pos[1] && yPos <= (pos[1] + pos[3])) || 
                        ((yPos + lines) >= pos[1] && (yPos + lines) <= (pos[1] + pos[3])))) {
                        if (((pos[0]           >= xPos && pos[0]            <= (xPos + nameWidth)) ||
                            ((pos[0] + pos[2]) >= xPos && (pos[0] + pos[2]) <= (xPos + nameWidth))) ||
                            ((xPos              >= pos[0] && xPos               <= (pos[0] + pos[2])) ||
                            ((xPos + nameWidth) >= pos[0] && (xPos + nameWidth) <= (pos[0] + pos[2]))))
                            yPos += lines;
                    }
                }
                this.linePoses.push([xPos + (2 / TextLayer.tileSize[0]),yPos,nameWidth,lines]);
                yPos += (this.text.size[1] / 2) + 25.33;
                this.text.line(xPos, y + h, xPos, yPos);
                this.text.stroke = '#EEEF';
                this.text.text(name, new Point(xPos + (2 / TextLayer.tileSize[0]), yPos));
            }
        }
    }
}
module.exports = Settings;