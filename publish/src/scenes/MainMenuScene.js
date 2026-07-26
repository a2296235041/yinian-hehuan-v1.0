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
        Game.UISkin.addPanel(this, width / 2, height / 2 + 5, 840, 410, 'card', {
            alpha: 0.94
        });
        this.add.text(width / 2, height / 2 - 130, '一念逍遥，一念合欢', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '50px',
            color: '#fff8fa',
            stroke: '#321522',
            strokeThickness: 5
        }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 - 72, '择一段来路，入红尘修行', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '20px',
            color: '#f0a8bb'
        }).setOrigin(0.5);
        this.createStartButton(width, height);
        this.createLoadSlots(width, height);
        this.add.text(width / 2, height - 34, '开始修行将创建全新进度，读档才会继续旧存档', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#fff8fa'
        }).setOrigin(0.5).setAlpha(0.76);
        this.game.canvas.setAttribute('aria-label', '一念逍遥，一念合欢主菜单');
        Game.SceneTransition.fadeIn(this);
        requestAnimationFrame(() => window.PlatformBridge.ready());
    }

    createStartButton(width, height) {
        Game.UISkin.makeButton(this, width / 2, height / 2 + 12, '开始修行', (button) => {
            window.GameAudio.start();
            window.GameAudio.sfx('success');
            button.disableInteractive();
            this.time.delayedCall(120, () => Game.SceneTransition.start(this, 'CharacterCreationScene'));
        }, { width: 230, height: 58, fontSize: 27 });
    }

    createLoadSlots(width, height) {
        this.add.text(width / 2, height / 2 + 80, '读取存档', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '18px',
            color: '#f0a8bb'
        }).setOrigin(0.5);
        const buttons = [1, 2, 3].map((slotId, index) => Game.UISkin.makeButton(
            this,
            width / 2 - 230 + index * 230,
            height / 2 + 140,
            `存档 ${slotId}\n读取中…`,
            null,
            { width: 210, height: 68, fontSize: 16, variant: 'secondary' }
        ).setAlpha(0.55).disableInteractive());
        window.GameSave.getStatuses().then((statuses) => {
            statuses.forEach((info) => this.configureSlotButton(buttons[info.slotId - 1], info));
        }).catch((error) => {
            console.error('读取存档列表失败:', error.code || '', error.message, error.stack);
            buttons.forEach((button, index) => button.setText(`存档 ${index + 1}\n不可用`));
        });
    }

    configureSlotButton(button, info) {
        if (!button?.active) return;
        if (!info.hasSave) {
            button.setText(`存档 ${info.slotId}\n空槽`);
            return;
        }
        button.setText(`存档 ${info.slotId}\n第 ${info.day} 天 · ${info.originName}`);
        button.setAlpha(1).setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => this.loadGame(info.slotId, button));
    }

    async loadGame(slotId, button) {
        if (button.getData('busy')) return;
        button.setData('busy', true).disableInteractive().setText(`存档 ${slotId}\n读取中…`);
        window.GameAudio.start();
        window.GameAudio.sfx('click');
        try {
            const snapshot = await window.GameSave.loadSlot(slotId);
            const origins = this.cache.json.get('character_origins') || [];
            const origin = origins.find((item) => item.id === snapshot.player.origin.id);
            if (!origin) throw new Error('存档中的玩家身份已失效');
            Game.SceneTransition.start(this, 'GameScene', {
                playerOrigin: origin,
                saveSnapshot: snapshot,
                newGame: false
            });
        } catch (error) {
            console.error('开始页读档失败:', error.code || '', error.message, error.stack);
            button.setData('busy', false).setText(`存档 ${slotId}\n读取失败`)
                .setInteractive({ useHandCursor: true });
        }
    }
};
