var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.PreloadScene = class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
        this.loadFailed = false;
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const totalResources = 18;

        this.cameras.main.setBackgroundColor('#09100e');
        Game.SceneTransition.fadeIn(this, 180);
        const title = this.add.text(width / 2, height / 2 - 58, '正在进入合欢宗', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '24px',
            color: '#fff8fa'
        }).setOrigin(0.5);
        const track = this.add.rectangle(width / 2, height / 2, 340, 18, 0x223c34)
            .setStrokeStyle(1, 0xf0a8bb, 0.7);
        const bar = this.add.rectangle(width / 2 - 168, height / 2, 0, 12, 0xd9577b)
            .setOrigin(0, 0.5);

        this.load.on('progress', (value) => {
            bar.width = 336 * value;
            window.PlatformBridge.progress({
                phase: 'resource_loading',
                loadedResources: Math.round(totalResources * value),
                totalResources,
                message: '正在加载宗门资源'
            });
        });
        this.load.on('loaderror', (file) => {
            this.loadFailed = true;
            console.error('资源加载失败:', file.key, file.src);
        });
        this.load.once('complete', () => {
            title.destroy();
            track.destroy();
            bar.destroy();
        });

        this.load.image('bg-sect', './assets/generated/sect-courtyard.c4be5633.webp');
        this.load.image('bg-sect-map', './assets/generated/sect-map.2a28a8cb.webp');
        this.load.image('npc-xiao-qingxuan', './assets/generated/npc-standee-xiao-qingxuan.7a93f059.webp');
        this.load.image('npc-scholar', './assets/generated/scholar-disciple.e2aa08f6.webp');
        this.load.image('npc-hu-jiuer', './assets/generated/npc-standee-hu-jiuer.a10661ad.webp');
        this.load.image('npc-su-meier', './assets/generated/npc-standee-su-meier.a9f08237.webp');
        this.load.image('npc-liu-hanyan', './assets/generated/npc-standee-liu-hanyan.340893ff.webp');
        this.load.image('npc-han-yueshuang', './assets/generated/npc-standee-han-yueshuang.352ae25d.webp');
        this.load.image('npc-yun-shuiyao', './assets/generated/npc-standee-yun-shuiyao.38bab51c.webp');
        this.load.image('npc-mo-qiaoer', './assets/generated/npc-standee-mo-qiaoer.webp');
        this.load.image('npc-bai-zhi', './assets/generated/npc-standee-bai-zhi.79c8c1df.webp');
        this.load.image('npc-qin-wanqing', './assets/generated/npc-standee-qin-wanqing.f515aa6e.webp');
        this.load.json('character_origins', './assets/data/character_origins.json');
        this.load.json('npcs', './assets/data/npcs.json');
        this.load.json('npc_openings', './assets/data/npc_openings.json');
        this.load.json('items', './assets/data/items.json');
        this.load.json('exploration_regions', './assets/data/exploration_regions.json');
        this.load.json('enemies', './assets/data/enemies.json');
    }

    create() {
        if (this.loadFailed) {
            window.PlatformBridge.fail('ASSET_LOAD_FAILED', '部分游戏资源加载失败');
            return;
        }
        window.PlatformBridge.progress({
            phase: 'runtime_initializing',
            loadedResources: 18,
            totalResources: 18,
            message: '正在布置宗门'
        });
        Game.SceneTransition.start(this, 'MainMenuScene');
    }
};
