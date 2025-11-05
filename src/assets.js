const path = require('node:path');
const { constants, ...fs } = require('node:fs/promises');
const Image = require('image-raub');
const { registerFont } = require('canvas');
/**
 * @typedef {{
 *   create(path: string): Promise<unknown>;
 *   destroy(instance: Object): void;
 *   types: string[];
 * }} Loader
 */
/** @type {Loader[]} */
const loaders = [
    // add more types later or smt idk
    {
        create(path) {
            return new Promise((resolve, reject) => {
                const img = new Image(path);
                img.onload = () => resolve(img);
                img.onerror = reject;
            });
        },
        /** @param {Image} instance */
        destroy(instance) {
            // @ts-ignore javascript wont actually stop us here, so do it anyways.
            instance.data.data = new Uint8Array(4);
        },
        types: ['png']
    },
    {
        create(path) { return fs.readFile(path, 'utf8'); },
        destroy(instance) {},
        types: ['svg']
    },
    {
        create(path) { return fs.readFile(path, 'utf8'); },
        destroy(instance) {},
        types: ['glsl']
    },
    {
        async create(file) {
            const { name } = path.parse(file);
            registerFont(file, { family: name })
            return name;
        },
        destroy(instance) {},
        types: ['ttf', 'otf', 'woff', 'woff2', 'dfont']
    }
]
class Asset {
    /** @type {string} */
    id;
    /** @type {string} */
    url;
    /** @type {boolean} */
    lazy;
    /** @type {unknown} */
    loaded;
    /** @type {Loader} */
    loader;
    /**
     * Loads in any known asset type into this loader
     * @param {string} id The id to assign to this asset. Must not be the same as any other existing id.
     * @param {string} url The path inside al sources to get this file from.
     * @param {boolean} lazy If this file should only actually be loaded into memory when the asset is requested.
     */
    constructor(id, url, lazy = false) {
        this.id = id;
        this.url = url;
        this.lazy = lazy;
        this.loaded = null;
        this.loader = null;
    }
    /**
     * Loads in this asset from disk.
     * @param {string[]} sources An array of real paths that may or may not contain this asset.
     * @returns {Promise<unknown>}
     */
    async load(sources) {
        if (this.loaded) return this.loaded;
        console.log('Loading asset', this.id, 'from file', this.url);
        for (const source of sources) {
            const abs = path.resolve(source, this.url);
            if (!(await fs.access(abs, constants.R_OK).then(() => true).catch(() => false)))
                continue;
            const type = path.extname(this.url).slice(1);
            const loader = this.loader ?? loaders.find(({ types }) => types.includes(type));
            this.loader = loader;
            this.loaded = await loader.create(abs);
            break;
        }
        console.log(!this.loaded ? 'Failed to load' : 'Finished loading', this.id);
        return this.loaded;
    }
    unload() {
        this.loader.destroy(this.loaded);
        this.loaded = null;
    }
}
class Assets {
    /** @type {string[]} */
    sources = [];
    /** @type {{ [key: string]: Asset }} */
    assets = {};
    /** @type {{ [key: string]: string }} */
    loadingStatus = {};

    constructor(mainDir) { this.addSource(mainDir); }

    /**
     * Loads in any known asset type into this loader
     * @param {string} id The id to assign to this asset. Must not be the same as any other existing id.
     * @param {string} url The path inside al sources to get this file from.
     * @param {boolean} lazy If this file should only actually be loaded into memory when the asset is requested.
     * @returns {Promise<unknown>} The result of the load, or nothing if lazy
     */
    async registerAsset(id, url, lazy) {
        this.assets[id] = new Asset(id, url, lazy);
        if (!lazy) {
            this.loadingStatus[id] = url;
            const loaded = await this.assets[id].load(this.sources);
            delete this.loadingStatus[id];
            return loaded;
        }
    }
    /**
     * Gets an asset, loading it if its not already.
     * @param {string} id The id of the asset to load in.
     * @returns {Asset}
     */
    get(id) {
        if (!this.assets[id].loaded) return this.assets[id].load(this.sources);
        return this.assets[id].loaded;
    }
    /**
     * Removes an asset, primarily intended for loading/unloading addons.
     * @param {string} id The id of the asset to remove.
     */
    remove(id) { delete this.assets[id]; }
    /**
     * Reloads all currently loaded assets.
     * @param source The source path to reload.
     */
    reload() {
        for (const assetId in this.assets) {
            const asset = this.assets[assetId];
            asset.unload();
            if (asset.lazy) continue;
            asset.load(this.sources);
        }
    }
    /**
     * Add in a directory to act as a resource pool for the game.
     * Reloads all assets when called. Smaller priority values are ran first.
     * @param {string} dir The directory to list as a source.
     * @param {number?} priority Optional. Defaults to top priority. What priority to put this source at.
     */
    addSource(dir, priority) {
        priority ??= 0;
        this.sources.splice(priority, 0, dir);
        this.reload();
    }
}

module.exports = {
    loaders,
    Asset,
    Assets
}