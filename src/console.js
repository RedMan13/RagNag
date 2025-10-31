/**
 * @typedef {'log'|'info'|'debug'|'warn'|'error'} LogType
 */
/**
 * @typedef {Object} StackTrace
 * @param {string} name Name/path of the function
 * @param {string} url The url on which this error exists
 * @param {[number,number]} evalOrigin The line/column inside an eval call.
 *  Is null for none-eval-shaped calls.
 * @param {EvalName?} evalType The type of eval this was ran with, such as 'eval', null or 'Function'
 * @param {[number,number]} origin The line/column that this call is from, any one of these
 *  values can be NaN to stand in for N/A.
 */
/**
 * @typedef {Object} LogItem
 * @prop {LogType} type Error type can be found here, though most of the time will likely have the whole app crash anyways
 * @prop {(string|Object)[]} content Pre-formated, objects are left untouched but are moved into their corosponding location
 * @prop {StackTrace[]} trace 
 */
class InternalConsole extends console.Console {
    /** @type {LogItem[]} */
    logs = [];
    logRollover = 40;
    /** @type {import('./renderer/src/RenderWebGL')} */
    render = null;
    static matchSubstitution = /%((?<type>[oOdisfc])|\.(?<precision>[0-9]+)f)/g;
    /**
     * Parses cromium error stacks, taken from penguinmod.github.io/src/lib/pm-log-capture.js
     * @param {string} stack The chromium error.stack value
     * @returns {StackTrace[]}
     */
    static _parseChromeStack(stack) {
        return stack.split('\n').slice(2)
            .map(line => {
                // we have no use for the human readable fluff
                line = line.slice(7);
                const firstOpenParen = line.indexOf('(');
                const secondOpenParen = line.indexOf('(', firstOpenParen +1);
                const firstCloseParen = line.indexOf(')');
                const secondCloseParen = line.indexOf(')', firstCloseParen +1);
                let fourthCol = line.lastIndexOf(':');
                let thirdCol = line.lastIndexOf(':', (fourthCol || line.length) -1);
                let secondCol = _lastIndexNaN(line, ':', (thirdCol || line.length) -1);
                let firstCol = _lastIndexNaN(line, ':', (secondCol || line.length) -1);
                if (secondOpenParen === -1) {
                    secondCol = fourthCol;
                    firstCol = thirdCol;
                    fourthCol = NaN;
                    thirdCol = NaN;
                }
                const name = line.slice(0, firstOpenParen -1);
                const origin = [
                    Number(line.slice(firstCol +1, secondCol)),
                    Number(line.slice(secondCol +1, thirdCol || firstCloseParen))
                ];
                let url = line.slice(firstOpenParen +1, firstCol);
                let evalType = null;
                let evalOrigin = null;
                if (secondOpenParen !== -1) {
                    url = line.slice(secondOpenParen +1, firstCol);
                    evalType = 'anonymous';
                    evalOrigin = [
                        Number(line.slice(thirdCol +1, fourthCol)),
                        Number(line.slice(fourthCol +1, secondCloseParen))
                    ];
                }

                return {
                    name,
                    url,
                    evalOrigin,
                    evalType,
                    origin
                };
            });
    }
    constructor(render) {
        super();
        this.render = render;
    }
    /**
     * Creates and appends a new log item to the list of logs
     * @param {LogType} type 
     * @param {(string|number|Object)[]} args 
     * @param {Error} error 
     */
    _appendLog(type, args, error) {
        const content = [];
        if (InternalConsole.matchSubstitution.test(args[0])) {
            let last = 0;
            let item = 1;
            for (const match of args[0].matchAll(InternalConsole.matchSubstitution)) {
                content.push(args[0].slice(last, match.index));
                let out = args[item];
                switch (match.groups.type) {
                case 'o':
                case 'O':
                    out = item;
                    break;
                case 'd':
                case 'i':
                    out = Number(item).toFixed(0);
                    break;
                case 's':
                    out = String(item);
                    break;
                case 'f':
                    out = String(Number(item));
                    break;
                case 'j':
                    try {
                        out = JSON.stringify(item);
                    } catch (err) {
                        if (err.message.includes('circular'))
                            out = '[Circular]';
                    }
                    break;
                // CSS styles arent processed
                case 'c':
                    out = '';
                    break;
                }
                content.push(out);
                item++;
                last = match[0].length = match.index;
            }
            content.push(args[0].slice(last));
        } else
            content.push(...args);
        this.logs.push({
            type,
            content: content
                .reduce((c,v) => (typeof c.at(-1) !== 'object' && typeof v !== 'object'
                    ? c[c.length -1] += v
                    : c.push(v), c), []),
            trace: InternalConsole._parseChromeStack(error.stack)
        });
        if (this.logs.length > this.logRollover) this.logs.shift();
    }
    log(...args) { super.log(...args); this._appendLog('log', args, new Error('trace')); }
    info(...args) { super.info(...args); this._appendLog('info', args, new Error('trace')); }
    debug(...args) { super.debug(...args); this._appendLog('debug', args, new Error('trace')); }
    warn(...args) { super.warn(...args); this._appendLog('warn', args, new Error('trace')); }
    error(...args) { super.error(...args); this._appendLog('error', args, new Error('trace')); }
}

module.exports = InternalConsole;