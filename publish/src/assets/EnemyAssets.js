var Game = window.Game || {};

/**
 * 敌人图集只在玩家进入探险页后加载，避免 1.9MB 战斗素材阻塞主菜单首屏。
 */
Game.EnemyAssets = {
    entries: [
        ['enemy-cloud-foothills', './assets/generated/enemy-sheet-cloud-foothills.59f0e13a.webp'],
        ['enemy-sunset-valley', './assets/generated/enemy-sheet-sunset-valley.48117510.webp'],
        ['enemy-frost-moon-marsh', './assets/generated/enemy-sheet-frost-moon-marsh.ebb2dd2c.webp'],
        ['enemy-myriad-beast', './assets/generated/enemy-sheet-myriad-beast.e55d3a84.webp'],
        ['enemy-endless-sandsea', './assets/generated/enemy-sheet-endless-sandsea.99cdfdea.webp'],
        ['enemy-sky-rift', './assets/generated/enemy-sheet-sky-rift.67386be4.webp'],
        ['enemy-starfall-sea', './assets/generated/enemy-sheet-starfall-sea.7f2aed35.webp'],
        ['enemy-great-void', './assets/generated/enemy-sheet-great-void.9c23e091.webp']
    ],
    loadingPromise: null,
    loadToken: 0,

    ensureLoaded(scene) {
        const missing = this.entries.filter(([key]) => !scene.textures.exists(key));
        if (!missing.length) return Promise.resolve(true);
        if (this.loadingPromise) return this.loadingPromise;
        const token = ++this.loadToken;
        this.loadingPromise = new Promise((resolve, reject) => {
            const failed = [];
            const onError = (file) => failed.push(file.key);
            const onShutdown = () => {
                scene.load.off('loaderror', onError);
                if (token === this.loadToken) this.loadingPromise = null;
                const error = new Error('敌人素材加载已取消');
                error.code = 'LOAD_CANCELLED';
                reject(error);
            };
            scene.load.on('loaderror', onError);
            scene.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
            scene.load.once('complete', () => {
                scene.load.off('loaderror', onError);
                scene.events.off(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
                if (token === this.loadToken) this.loadingPromise = null;
                if (failed.length) {
                    reject(new Error(`敌人素材加载失败: ${failed.join(', ')}`));
                } else {
                    resolve(true);
                }
            });
            missing.forEach(([key, path]) => scene.load.image(key, path));
            scene.load.start();
        });
        return this.loadingPromise;
    },

    ensureLoadedSafe(scene, timeoutMs = 8000) {
        let timer = null;
        const timeout = new Promise((resolve) => {
            timer = window.setTimeout(() => resolve(false), timeoutMs);
        });
        const loading = Promise.resolve().then(() => this.ensureLoaded(scene));
        return Promise.race([loading, timeout]).finally(() => {
            if (timer !== null) window.clearTimeout(timer);
        });
    },

    reportLoadStatus(view, loaded, error = null) {
        if (error) console.error('敌人素材加载失败:', error.message, error.stack);
        if (!view?.status?.active || (!error && loaded !== false)) return;
        Game.ExplorationView.setStatus(
            view,
            error ? '部分敌人图鉴暂不可用，但仍可继续探索。' : '敌人图鉴加载较慢，仍可继续探索。',
            true
        );
    }
};
