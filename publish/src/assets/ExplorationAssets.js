var Game = window.Game || {};
Game.ExplorationAssets = {
    entries: {
        cloud_foothills: [
            'explore-cloud-foothills',
            './assets/generated/explore-cloud-foothills.e418e212.webp'
        ],
        sunset_valley: [
            'explore-sunset-valley',
            './assets/generated/explore-sunset-valley.470ef07a.webp'
        ],
        frost_moon_marsh: [
            'explore-frost-moon-marsh',
            './assets/generated/explore-frost-moon-marsh.0b351851.webp'
        ],
        myriad_beast_range: [
            'explore-myriad-beast-range',
            './assets/generated/explore-myriad-beast-range.9f438e56.webp'
        ],
        endless_sandsea: [
            'explore-endless-sandsea',
            './assets/generated/explore-endless-sandsea.ce456158.webp'
        ],
        sky_rift_battlefield: [
            'explore-sky-rift-battlefield',
            './assets/generated/explore-sky-rift-battlefield.ca97e69d.webp'
        ],
        starfall_sea: [
            'explore-starfall-sea',
            './assets/generated/explore-starfall-sea.0b1ed7f8.webp'
        ],
        great_void_relic: [
            'explore-great-void-relic',
            './assets/generated/explore-great-void-relic.e6d47622.webp'
        ]
    },
    pending: new Map(),
    key(regionId) {
        return this.entries[regionId]?.[0] || 'bg-sect-map';
    },
    ensureLoaded(scene, regionId) {
        const entry = this.entries[regionId];
        if (!entry) return Promise.resolve(false);
        const [textureKey, path] = entry;
        if (scene.textures.exists(textureKey)) return Promise.resolve(true);
        if (this.pending.has(textureKey)) return this.pending.get(textureKey);
        const promise = new Promise((resolve, reject) => {
            const complete = `filecomplete-image-${textureKey}`;
            const cleanup = () => {
                scene.load.off(complete, onComplete);
                scene.load.off('loaderror', onError);
            };
            const onComplete = () => {
                cleanup();
                resolve(true);
            };
            const onError = (file) => {
                if (file.key !== textureKey) return;
                cleanup();
                reject(new Error(`探险背景加载失败: ${textureKey}`));
            };
            scene.load.once(complete, onComplete);
            scene.load.on('loaderror', onError);
            scene.load.image(textureKey, path);
            if (!scene.load.isLoading()) scene.load.start();
        }).finally(() => this.pending.delete(textureKey));
        this.pending.set(textureKey, promise);
        return promise;
    }
};
