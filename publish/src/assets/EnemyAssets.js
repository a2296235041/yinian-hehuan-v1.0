var Game = window.Game || {};

/**
 * 敌人图集只在实际触发战斗时按需加载，避免进入探险页时集中解码全部图集。
 */
Game.EnemyAssets = {
    entries: {
        'enemy-cloud-foothills': './assets/generated/enemy-sheet-cloud-foothills.59f0e13a.webp',
        'enemy-sunset-valley': './assets/generated/enemy-sheet-sunset-valley.48117510.webp',
        'enemy-frost-moon-marsh': './assets/generated/enemy-sheet-frost-moon-marsh.ebb2dd2c.webp',
        'enemy-myriad-beast': './assets/generated/enemy-sheet-myriad-beast.e55d3a84.webp',
        'enemy-endless-sandsea': './assets/generated/enemy-sheet-endless-sandsea.99cdfdea.webp',
        'enemy-sky-rift': './assets/generated/enemy-sheet-sky-rift.67386be4.webp',
        'enemy-starfall-sea': './assets/generated/enemy-sheet-starfall-sea.7f2aed35.webp',
        'enemy-great-void': './assets/generated/enemy-sheet-great-void.9c23e091.webp'
    },
    pending: new Map(),

    ensureKeyLoaded(scene, textureKey, timeoutMs = 8000) {
        const path = this.entries[textureKey];
        if (!path) return Promise.resolve(false);
        if (scene.textures.exists(textureKey)) return Promise.resolve(true);
        if (this.pending.has(textureKey)) return this.pending.get(textureKey);
        const promise = new Promise((resolve, reject) => {
            const complete = `filecomplete-image-${textureKey}`;
            let timer = null;
            const cleanup = () => {
                if (timer !== null) window.clearTimeout(timer);
                scene.load.off(complete, onComplete);
                scene.load.off('loaderror', onError);
                scene.events.off(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
            };
            const onComplete = () => {
                cleanup();
                resolve(true);
            };
            const onError = (file) => {
                if (file.key !== textureKey) return;
                cleanup();
                reject(new Error(`敌人素材加载失败: ${textureKey}`));
            };
            const onShutdown = () => {
                cleanup();
                const error = new Error('敌人素材加载已取消');
                error.code = 'LOAD_CANCELLED';
                reject(error);
            };
            const onTimeout = () => {
                cleanup();
                resolve(false);
            };
            scene.load.once(complete, onComplete);
            scene.load.on('loaderror', onError);
            scene.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
            timer = window.setTimeout(onTimeout, timeoutMs);
            try {
                scene.load.image(textureKey, path);
                if (!scene.load.isLoading()) scene.load.start();
            } catch (error) {
                cleanup();
                reject(error);
            }
        }).finally(() => this.pending.delete(textureKey));
        this.pending.set(textureKey, promise);
        return promise;
    }
};
