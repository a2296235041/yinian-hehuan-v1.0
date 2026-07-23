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

        this.createLoadButton(width, height);

        this.add.text(width / 2, height - 44, '点击人物交谈，修炼并推进时日', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#f4ead2'
        }).setOrigin(0.5).setAlpha(0.76);

        this.game.canvas.setAttribute('aria-label', '一念逍遥，一念合欢主菜单');
        requestAnimationFrame(() => window.PlatformBridge.ready());
    }

    createLoadButton(width, height) {
        const button = this.add.text(width / 2, height / 2 + 142, '读档', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '22px',
            color: '#f4ead2',
            backgroundColor: '#14231f',
            padding: { x: 26, y: 11 }
        }).setOrigin(0.5).setAlpha(0.5);
        window.GameSave.getStatus().then((status) => {
            if (!button.active) return;
            if (!status.hasSave) {
                button.setText('暂无存档');
                return;
            }
            button.setText(`读档 · 第 ${status.day} 天`);
            button.setAlpha(1).setInteractive({ useHandCursor: true });
            button.on('pointerdown', () => this.loadGame(button));
        }).catch((error) => {
            console.error('读取存档状态失败:', error.code || '', error.message, error.stack);
            if (button.active) button.setText('读档不可用');
        });
    }

    async loadGame(button) {
        if (button.getData('busy')) return;
        button.setData('busy', true).disableInteractive().setText('读档中…');
        window.GameAudio.start();
        window.GameAudio.sfx('click');
        try {
            const snapshot = await window.GameSave.loadSlot();
            const origins = this.cache.json.get('character_origins') || [];
            const origin = origins.find((item) => item.id === snapshot.player.origin.id);
            if (!origin) throw new Error('存档中的玩家身份已失效');
            this.scene.start('GameScene', { playerOrigin: origin, saveSnapshot: snapshot });
        } catch (error) {
            console.error('开始页读档失败:', error.code || '', error.message, error.stack);
            button.setData('busy', false).setText('读档失败').setInteractive({ useHandCursor: true });
        }
    }
};
