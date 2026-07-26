/**
 * @file PreloadScene.js
 * @description 游戏预加载场景
 * 负责加载游戏所需的大部分或全部资源，同时向玩家显示一个加载进度条。
 * 加载完成后，它会启动主菜单场景（MainMenuScene）。
 */

var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.PreloadScene = class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        console.log('PreloadScene: preload');

        // 1. 获取画布的宽度和高度，用于居中显示加载条
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 2. 创建加载进度条的背景和边框
        // 这是一个简单的灰色矩形作为背景
        const progressBarBackground = this.add.graphics();
        progressBarBackground.fillStyle(0x333333, 0.8);
        progressBarBackground.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        // 这是一个白色的矩形作为进度条本身
        const progressBar = this.add.graphics();

        // 3. 创建加载文字
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: '正在进入合欢宗...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        // 4. 监听Phaser的加载进度事件
        this.load.on('progress', (value) => {
            // 每次加载进度更新时，清除并重绘进度条
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        // 5. 监听Phaser的加载完成事件
        this.load.on('complete', () => {
            console.log('PreloadScene: load complete');
            // 加载完成后，销毁进度条和文字
            progressBar.destroy();
            progressBarBackground.destroy();
            loadingText.destroy();
        });

        // 6. 在这里开始加载游戏所需的所有资源
        // ==================================================
        // 在这里开始加载游戏所需的所有资源
        
        // 加载我们为初始身份设计的JSON数据文件
        this.load.json('character_origins', 'assets/data/character_origins.json');
        
        // 加载修炼体系和NPC数据文件
        this.load.json('cultivation_levels', 'assets/data/cultivation_levels.json');
        this.load.json('npcs', 'assets/data/npcs.json');

        // 加载对话文件
        this.load.json('su_meier_dialogue', 'assets/dialogue/su_meier_dialogue.json');
        this.load.json('liu_hanyan_dialogue', 'assets/dialogue/liu_hanyan_dialogue.json');
        this.load.json('han_yueshuang_dialogue', 'assets/dialogue/han_yueshuang_dialogue.json');
        this.load.json('yun_shuiyao_dialogue', 'assets/dialogue/yun_shuiyao_dialogue.json');
        this.load.json('qin_wanqing_dialogue', 'assets/dialogue/qin_wanqing_dialogue.json');
        this.load.json('mo_qiaoer_dialogue', 'assets/dialogue/mo_qiaoer_dialogue.json');
        this.load.json('bai_zhi_dialogue', 'assets/dialogue/bai_zhi_dialogue.json');
        this.load.json('hu_jiuer_dialogue', 'assets/dialogue/hu_jiuer_dialogue.json');
        this.load.json('xiao_qingxuan_dialogue', 'assets/dialogue/xiao_qingxuan_dialogue.json');

        // 这里可以继续加载其他资源，例如按钮图片、背景图等
        // this.load.image('background', 'assets/images/background.png');

        // ==================================================
    }

    create() {
        console.log('PreloadScene: create');
        
        // 所有资源加载完成后，这个方法会被调用。
        // 我们在这里启动主菜单场景。
        this.scene.start('MainMenuScene');
    }
};
