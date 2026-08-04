var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.PreloadScene = class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
        this.loadFailed = false;
        this.totalResources = 2;
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const totalResources = 2;
        this.totalResources = totalResources;

        window.PlatformBridge.progress({
            phase: 'resource_loading',
            loadedResources: 0,
            totalResources,
            message: '正在加载宗门资源'
        });
        this.cameras.main.setBackgroundColor('#09100e');
        Game.SceneTransition.fadeIn(this, 180);
        const loadingView = this.createLoadingView(width, height);

        const onProgress = (value) => {
            loadingView.update(value);
            window.PlatformBridge.progress({
                phase: 'resource_loading',
                loadedResources: Math.round(totalResources * value),
                totalResources,
                message: '正在加载宗门资源'
            });
        };
        const onLoadError = (file) => {
            this.loadFailed = true;
            console.error('资源加载失败:', file.key, file.src);
        };
        this.load.on('progress', onProgress);
        this.load.on('loaderror', onLoadError);
        this.load.once('complete', () => {
            this.load.off('progress', onProgress);
            this.load.off('loaderror', onLoadError);
            loadingView.complete();
        });

        this.load.image('bg-sect', './assets/generated/sect-courtyard.c4be5633.webp');
        this.load.json(
            'character_origins',
            './assets/data/character_origins.v025.json?v=20260804-12'
        );
    }

    createLoadingView(width, height) {
        const splash = document.getElementById('boot-splash');
        if (splash) splash.hidden = true;
        try {
            return Game.PreloadDecor.create(this, width, height);
        } catch (error) {
            console.error('加载页装饰渲染失败:', error.message, error.stack);
            const title = this.add.text(width / 2, height / 2 - 58, '正在进入合欢宗', {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '24px',
                color: '#fff8fa'
            }).setOrigin(0.5);
            const track = this.add.rectangle(width / 2, height / 2, 340, 18, 0x223c34)
                .setStrokeStyle(1, 0xf0a8bb, 0.7);
            const bar = this.add.rectangle(width / 2 - 168, height / 2, 0, 12, 0xd9577b)
                .setOrigin(0, 0.5);
            return {
                update(value) { bar.width = 336 * value; },
                complete() { title.setText('山门已开'); track.setAlpha(0.8); }
            };
        }
    }

    create() {
        if (this.loadFailed) {
            window.PlatformBridge.fail('ASSET_LOAD_FAILED', '部分游戏资源加载失败');
            return;
        }
        window.PlatformBridge.progress({
            phase: 'runtime_initializing',
            loadedResources: this.totalResources,
            totalResources: this.totalResources,
            message: '正在布置宗门'
        });
        Game.SceneTransition.start(this, 'MainMenuScene');
    }
};
