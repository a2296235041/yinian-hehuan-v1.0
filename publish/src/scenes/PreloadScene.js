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
        const totalResources = 16;

        this.cameras.main.setBackgroundColor('#09100e');
        const title = this.add.text(width / 2, height / 2 - 58, '正在进入合欢宗', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '24px',
            color: '#f4ead2'
        }).setOrigin(0.5);
        const track = this.add.rectangle(width / 2, height / 2, 340, 18, 0x223c34)
            .setStrokeStyle(1, 0xd8c38c, 0.7);
        const bar = this.add.rectangle(width / 2 - 168, height / 2, 0, 12, 0xd8c38c)
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
        this.load.image('npc-master', './assets/generated/sect-master.b9883f28.webp');
        this.load.image('npc-scholar', './assets/generated/scholar-disciple.e2aa08f6.webp');
        this.load.image('npc-fox', './assets/generated/fox-princess.6e212211.webp');
        this.load.json('character_origins', './assets/data/character_origins.json');
        this.load.json('cultivation_levels', './assets/data/cultivation_levels.json');
        this.load.json('npcs', './assets/data/npcs.json');

        [
            'su_meier', 'liu_hanyan', 'han_yueshuang', 'yun_shuiyao',
            'qin_wanqing', 'mo_qiaoer', 'bai_zhi', 'hu_jiuer', 'xiao_qingxuan'
        ].forEach((id) => {
            this.load.json(`${id}_dialogue`, `./assets/dialogue/${id}_dialogue.json`);
        });
    }

    create() {
        if (this.loadFailed) {
            window.PlatformBridge.fail('ASSET_LOAD_FAILED', '部分游戏资源加载失败');
            return;
        }
        window.PlatformBridge.progress({
            phase: 'runtime_initializing',
            loadedResources: 16,
            totalResources: 16,
            message: '正在布置宗门'
        });
        this.scene.start('MainMenuScene');
    }
};
