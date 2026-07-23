var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.MainMenuScene = class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        window.GameModelUI.setMode('compact');
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const background = this.add.image(width / 2, height / 2, 'bg-sect');
        background.setScale(Math.max(width / background.width, height / background.height));
        this.add.rectangle(width / 2, height / 2, width, height, 0x07100d, 0.38);
        this.add.rectangle(width / 2, height / 2 + 5, 690, 350, 0x0d1b17, 0.78)
            .setStrokeStyle(2, 0xd8c38c, 0.65);

        this.add.text(width / 2, height / 2 - 105, '一念逍遥，一念合欢', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '50px',
            color: '#f4ead2',
            stroke: '#14231f',
            strokeThickness: 5
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 2 - 35, '择一段来路，入红尘修行', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '20px',
            color: '#d8c38c'
        }).setOrigin(0.5);

        const startButton = this.add.text(width / 2, height / 2 + 75, '开始修行', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '30px',
            color: '#14231f',
            backgroundColor: '#f4ead2',
            padding: { x: 32, y: 14 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        startButton.on('pointerdown', () => {
            window.GameAudio.start();
            window.GameAudio.sfx('success');
            startButton.disableInteractive();
            this.tweens.add({
                targets: startButton,
                scale: 0.94,
                duration: 90,
                yoyo: true,
                onComplete: () => this.scene.start('CharacterCreationScene')
            });
        });

        this.add.text(width / 2, height - 44, '点击人物交谈，修炼并推进时日', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#f4ead2'
        }).setOrigin(0.5).setAlpha(0.76);

        this.game.canvas.setAttribute('aria-label', '一念逍遥，一念合欢主菜单');
        requestAnimationFrame(() => window.PlatformBridge.ready());
    }
};
