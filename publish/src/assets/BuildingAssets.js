var Game = window.Game || {};

/**
 * 六张建筑大背景按进入场景时加载，避免它们阻塞主菜单和开局首屏。
 * 加载失败时不销毁当前画面，GameScene 会继续显示通用庭院背景。
 */
Game.BuildingAssets = {
    paths: Object.freeze({
        'bg-welcome-pavilion': './assets/generated/bg-welcome-pavilion.98ecba18.v070.webp',
        'bg-master-palace': './assets/generated/bg-master-palace.02e6fa03.v070.webp',
        'bg-discipline-hall': './assets/generated/bg-discipline-hall.da2025ff.v070.webp',
        'bg-archive-tower': './assets/generated/bg-archive-tower.4610c08f.v070.webp',
        'bg-craft-workshop': './assets/generated/bg-craft-workshop.89c3e161.v070.webp',
        'bg-rear-sanctuary': './assets/generated/bg-rear-sanctuary.0abf97c6.v070.webp'
    }),
    pending: new Map(),

    ensureLoaded(scene, textureKey) {
        if (scene.textures.exists(textureKey)) return Promise.resolve(true);
        if (this.pending.has(textureKey)) return this.pending.get(textureKey);
        const path = this.paths[textureKey];
        if (!path) return Promise.reject(new Error(`未知建筑背景: ${textureKey}`));

        const promise = new Promise((resolve, reject) => {
            const eventName = `filecomplete-image-${textureKey}`;
            const cleanup = () => {
                scene.load.off(eventName, onComplete);
                scene.load.off('loaderror', onError);
            };
            const onComplete = () => {
                cleanup();
                resolve(true);
            };
            const onError = (file) => {
                if (file.key !== textureKey) return;
                cleanup();
                reject(new Error(`建筑背景加载失败: ${textureKey}`));
            };
            scene.load.once(eventName, onComplete);
            scene.load.on('loaderror', onError);
            scene.load.image(textureKey, Game.AssetUrl.withVersion(path));
            if (!scene.load.isLoading()) scene.load.start();
        }).finally(() => this.pending.delete(textureKey));

        this.pending.set(textureKey, promise);
        return promise;
    },

    apply(scene, building, backdrop) {
        this.ensureLoaded(scene, building.backgroundKey).then(() => {
            if (!scene.sys.isActive() || scene.currentBuilding?.id !== building.id) return;
            Game.SceneBackdrop.setTexture(scene, backdrop, building.backgroundKey);
        }).catch((error) => {
            console.error('建筑背景加载失败:', error.message, error.stack);
        });
    }
};
