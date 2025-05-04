module.exports = {
    root: true,
    extends: ['scratch', 'scratch/es6', 'scratch/node'],
    rules: {
        'operator-linebreak': 'off'
    },
    env: {
        node: false,
        browser: true // TODO: disable this
    },
    globals: {
        Buffer: true // TODO: remove this?
    }
};
