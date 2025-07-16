const { createCanvas, loadImage } = require('canvas');
const Point = require('./point.js');

const mainSyntax = [
    [/^(#{1,3})\s+(.+?)(\n|$)/i, true, [false, true], (level, content) => {
        switch (level) {
        default:
        case '#':
            return ['head-large', content];
        case '##':
            return ['head-medium', content];
        case '###':
            return ['head-small', content];
        }
    }],
    [/^-#\s+(.+?)(\n|$)/i, true, [true], content => ['footer', content]],
    [/^\*\*\*(.+?)\*\*\*/i, false, [true], content => ['bold', ['italic', content]]],
    [/^\*\*(.+?)\*\*/i, false, [true], content => ['bold', content]],
    [/^\*(.+?)\*/i, false, [true], content => ['italic', content]],
    [/^~~(.+?)~~/i, false, [true], content => ['strike', content]],
    [/^__(.+?)__/i, false, [true], content => ['underline', content]],
    [/^!\[(.+?)\]\(<?(.+?)>?\)/i, false, [true, false], (alt, url) => ['image', alt, url]],
    [/^\n/i, false, () => ['newline']],
];
async function tokenize(text, syntax = mainSyntax) {
    const out = [''];
    for (let i = 0; i < text.length; i++) {
        const test = text.slice(i);
        const form = syntax.find(([reg, multiline]) => multiline 
            ? text[i] === '\n' && reg.test(test.slice(1)) 
            : reg.test(test));
        if (!form) {
            out[out.length -1] += text[i];
            continue;
        }
        const match = form[1]
            ? form[0].exec(test.slice(1))
            : form[0].exec(test);
        const el = match.length <= 1
            ? await form[2](match[0])
            : await form[3](
                ...(await Promise.all(match
                    .slice(1)
                    .map((m,i) => (form[2][i] ?? true)
                        ? tokenize(m)
                        : m))),
                match.groups
            );
        if (out.at(-1) === '') out.pop();
        out.push(el, '');
        i += match[0].length -1;
        if (form[1] && (i +2) === text.length) break;
    }
    if (out.at(-1) === '') out.pop();
    return out;
}
function lexerize(tokens, style = { size: 20, fill: 'white', stroke: 'black' }) {
    const res = [style];
    for (const idx in tokens) {
        const token = tokens[idx];
        if (typeof token === 'string') { res.push(token); continue; }
        const outerStyle = { ...style };
        style = { ...style };
        switch (token[0]) {
        case 'head-large': style.size += 30; style.weight = 'bold'; style.break = true; break;
        case 'head-medium': style.size += 20; style.weight = 'bold'; style.break = true; break;
        case 'head-small': style.size += 10; style.weight = 'bold'; style.break = true; break;
        case 'footer': style.size -= 7; style.break = true; break;
        case 'bold': style.weight = 'bold'; break;
        case 'italic': style.italic = true; break;
        case 'strike': style.strike = true; break;
        case 'underline': style.underline = true; break;
        case 'image': style.image = token[2]; break;
        case 'newline': style.break = true; break;
        } 
        res.push(...lexerize(token[1], style));
        res.push(outerStyle);
        style = { ...outerStyle };
    }
    return res;
}
async function render(lexes) {
    const can = createCanvas(2048,4096);
    const ctx = can.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.lineWidth = 1;
    const cursor = new Point(0,0);
    const farthestCur = new Point(0,0);
    let lineHeight = 0;
    let style;
    for (const command of lexes) {
        ctx.font = `${command.italic ? 'italic' : ''} ${command.weight ?? ''} ${command.size}px sans-serif`;
        ctx.fillStyle = command.fill;
        ctx.strokeStyle = command.stroke;
        if (typeof command === 'string' && !style.image) {
            const size = ctx.measureText(command);
            const width = size.actualBoundingBoxRight - size.actualBoundingBoxLeft;
            const height = size.actualBoundingBoxDescent - size.actualBoundingBoxAscent;
            lineHeight = height;
            ctx.strokeText(command, ...cursor);
            ctx.fillText(command, ...cursor);
            if (style.underline)
                ctx.fillRect(cursor[0], cursor[1] + size.actualBoundingBoxDescent, width, 1);
            if (style.strike)
                ctx.fillRect(cursor[0], cursor[1] + (height / 2), width, 1);
            cursor[0] += width;
            farthestCur.max(cursor);
            continue;
        }
        if (command.break) { cursor[0] = 0; cursor[1] += lineHeight; }
        if (command.image) {
            const img = await loadImage(command.image).catch(() => {});
            if (!img) delete command.image;
            else {
                lineHeight = img.height;
                ctx.drawImage(img, ...cursor);
                cursor[0] += img.width;
                farthestCur.max(cursor);
            }
        }
        style = command;
    }
    // shrink wrap the output incase theres less text then actually fills in the box
    const content = ctx.getImageData(0,0, farthestCur[0], farthestCur[1] + lineHeight);
    return content;
}

module.exports.tokenize = tokenize;
module.exports.lexerize = lexerize;
module.exports.render = render;

module.exports.renderString = async (text, style) => {
    const tokens = await tokenize(text);
    const lexes = lexerize(tokens, style);
    return await render(lexes);
}