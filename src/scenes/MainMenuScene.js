/**
 * @file MainMenuScene.js
 * @description 游戏主菜单场景
 * 这是玩家进入游戏后看到的第一个交互界面。
 * 通常包含“开始游戏”、“读取存档”、“设置”等选项。
 */

var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.MainMenuScene = class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    preload() {
        // 主菜单如果需要特定资源（如背景图、按钮图），可以在PreloadScene中加载
        console.log('MainMenuScene: preload');
    }

    create() {
        console.log('MainMenuScene: create');

        // 1. 获取画布的宽度和高度，用于居中显示元素
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 2. 添加背景色或背景图
        this.cameras.main.setBackgroundColor('#2d2d2d');

        // 3. 添加游戏标题
        const titleText = this.add.text(width / 2, height / 2 - 100, '一念逍遥，一念合欢', {
            font: '48px monospace',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        });
        titleText.setOrigin(0.5, 0.5);

        // 4. 添加“开始游戏”按钮
        const startButton = this.add.text(width / 2, height / 2 + 50, '开始双修', {
            font: '32px monospace',
            fill: '#00ff00',
            backgroundColor: '#555555',
            padding: { x: 20, y: 10 }
        });
        startButton.setOrigin(0.5, 0.5);

        // 5. 为按钮添加交互
        startButton.setInteractive({ useHandCursor: true }); // 鼠标悬浮时显示手型指针

        // 监听按钮的点击事件
        startButton.on('pointerdown', () => {
            console.log('开始游戏按钮被点击');
            // 点击后，启动核心游戏场景
            // this.scene.start('GameScene');
            // 暂时先不跳转，因为GameScene还没创建
            
            // 添加一个简单的点击效果
            this.tweens.add({
                targets: startButton,
                scaleX: 0.9,
                scaleY: 0.9,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    // 效果完成后，跳转到角色创建场景
                    this.scene.start('CharacterCreationScene');
                }
            });
        });
    }
};
