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
        try {
            Game.MainMenuDecor.addPetals(this, width, height);
        } catch (error) {
            console.error('主菜单花瓣渲染失败:', error.message, error.stack);
        }
        Game.UISkin.addPanel(this, width / 2, height / 2 + 5, 840, 410, 'card', {
            alpha: 0.94
        });
        this.createMenuDecor(width, height);
        this.add.text(width / 2, height / 2 - 72, '择一段来路，入红尘修行', {
            fontFamily: '"STKaiti", "KaiTi", "Noto Serif SC", serif',
            fontSize: '20px',
            color: '#f3bcc9'
        }).setOrigin(0.5).setShadow(0, 2, '#180811', 0.8);
        this.createStartButton(width, height);
        this.createLoadSlots(width, height);
        this.add.text(width / 2, height - 34, '开始修行将创建全新进度，读档才会继续旧存档', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#fff8fa'
        }).setOrigin(0.5).setAlpha(0.76);
        this.game.canvas.setAttribute('aria-label', '一念逍遥，一念合欢主菜单');
        Game.SceneTransition.fadeIn(this);
        window.PlatformBridge.progress({
            phase: 'first_frame',
            message: '正在显示主菜单'
        });
        requestAnimationFrame(() => {
            window.PlatformBridge.ready();
        });
    }

    createMenuDecor(width, height) {
        try {
            Game.MainMenuDecor.addPanel(this, width, height);
            Game.MainMenuDecor.addTitle(this, width, height);
        } catch (error) {
            console.error('主菜单装饰渲染失败:', error.message, error.stack);
            this.add.text(width / 2, height / 2 - 130, '一念逍遥，一念合欢', {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '50px',
                color: '#fff8fa',
                stroke: '#321522',
                strokeThickness: 5
            }).setOrigin(0.5);
        }
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
        const slotLabels = ['自动存档', '存档 1', '存档 2', '存档 3'];
        const buttons = slotLabels.map((label, index) => Game.UISkin.makeButton(
            this,
            width / 2 - 285 + index * 190,
            height / 2 + 140,
            `${label}\n读取中…`,
            null,
            { width: 175, height: 68, fontSize: 15, variant: 'secondary' }
        ).setAlpha(0.55).disableInteractive());
        Promise.all([window.GameAutoSave.getStatus(), window.GameSave.getStatuses()]).then(
          ([autoStatus, manualStatuses]) => {
            const statuses = [
              autoStatus,
              ...manualStatuses.map((info) => ({ ...info, label: `存档 ${info.slotId}` }))
            ];
            statuses.forEach((info, index) => this.configureSlotButton(buttons[index], info));
        }).catch((error) => {
            console.error('读取存档列表失败:', error.code || '', error.message, error.stack);
            buttons.forEach((button, index) => button.setText(`${slotLabels[index]}\n不可用`));
        });
    }

    configureSlotButton(button, info) {
        if (!button?.active) return;
        if (!info.hasSave) {
            button.setText(`${info.label}\n空槽`);
            return;
        }
        const originName = String(info.originName || '').slice(0, 5);
        button.setText(`${info.label}\n第${info.day}天 · ${originName}`);
        button.setAlpha(1).setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => this.loadGame(info, button));
    }

    async loadGame(info, button) {
        if (button.getData('busy')) return;
        button.setData('busy', true).disableInteractive().setText(`${info.label}\n读取中…`);
        window.GameAudio.start();
        window.GameAudio.sfx('click');
        try {
            const snapshot = info.slotId === 'auto'
                ? await window.GameAutoSave.loadSlot()
                : await window.GameSave.loadSlot(info.slotId);
            const origins = this.cache.json.get('character_origins') || [];
            const origin = origins.find((item) => item.id === snapshot.player.origin.id);
            if (!origin) throw new Error('存档中的玩家身份已失效');
            await Game.PlayerPortraitAssets.ensureLoaded(this, origin);
            Game.SceneTransition.start(this, 'GameScene', {
                playerOrigin: origin,
                saveSnapshot: snapshot,
                newGame: false
            });
        } catch (error) {
            console.error('开始页读档失败:', error.code || '', error.message, error.stack);
            button.setData('busy', false).setText(`${info.label}\n读取失败`)
                .setInteractive({ useHandCursor: true });
        }
    }
};
