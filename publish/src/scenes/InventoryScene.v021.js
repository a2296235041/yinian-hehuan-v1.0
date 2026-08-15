var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};
// 储物袋采用独立覆盖场景，底层地图暂停，避免玩家查看物品时误点建筑。
Game.Scenes.InventoryScene = class InventoryScene extends Phaser.Scene {
    constructor() {
        super('InventoryScene');
        this.entryObjects = [];
        this.spiritStoneText = null;
        this.baseScenesRestored = false;
        this.page = 0;
        this.pageText = null;
        this.useStatusText = null;
        this.busyItemId = null;
        this.requestId = 0;
        this.quantityDialog = null;
    }
    create() {
        this.baseScenesRestored = false;
        this.busyItemId = null;
        this.scene.pause('GameScene');
        this.scene.pause('UIScene');
        this.scene.setVisible(false, 'GameScene');
        this.scene.setVisible(false, 'UIScene');
        window.GameModelUI.setMode('hidden');
        Game.EventBus.emit('tutorial-inventory-opened');
        this.add.image(640, 360, 'bg-sect').setDisplaySize(1280, 720);
        this.add.rectangle(640, 360, 1280, 720, 0x06100d, 0.8)
            .setInteractive();
        Game.CommerceDecor.createShell(this, '储物袋', '灵物归藏 · 随取随用');
        this.spiritStoneText = Game.CommerceDecor.addCurrency(this, 174, 113);
        Game.UISkin.makeButton(this, 1170, 54, '返回', () => this.close(), {
            width: 120, height: 46, fontSize: 19, variant: 'secondary'
        });
        this.useStatusText = this.add.text(640, 596, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#f0a8bb',
            fixedWidth: 820,
            align: 'center'
        }).setOrigin(0.5);
        this.makePageButton(555, '‹', -1);
        this.pageText = this.add.text(640, 652, '', {
            fontFamily: 'serif',
            fontSize: '17px',
            color: '#fff8fa'
        }).setOrigin(0.5);
        this.makePageButton(725, '›', 1);
        const guideButton = this.add.text(1190, 652, '⚙', {
            fontFamily: 'sans-serif', fontSize: '18px', color: '#aab1ac',
            padding: { x: 12, y: 10 }
        }).setOrigin(0.5).setAlpha(0.28).setInteractive({ useHandCursor: true });
        guideButton.on('pointerover', () => guideButton.setAlpha(0.5));
        guideButton.on('pointerout', () => guideButton.setAlpha(0.28));
        guideButton.on('pointerdown', () => {
            window.GameAudio.sfx('click');
            window.GameCheatPanel.open();
        });
        Game.EventBus.on('inventory-changed', this.renderItems, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        window.GameInventory.ready().then(() => this.renderItems());
        this.renderItems();
        Game.SceneTransition.fadeIn(this);
    }
    renderItems() {
        Game.InventoryGridView.render(this);
    }
    makePageButton(x, label, offset) {
        Game.UISkin.makeButton(this, x, 660, label, () => {
            const count = Math.max(1, Math.ceil(
                window.GameInventory.getSnapshot().items.filter((item) => item.quantity > 0).length / 8
            ));
            this.page = (this.page + offset + count) % count;
            window.GameAudio.sfx('click');
            this.renderItems();
        }, { width: 62, height: 40, fontSize: 24, variant: 'secondary' });
    }
    openUseDialog(item) {
        if (this.busyItemId) return;
        this.quantityDialog?.close();
        this.quantityDialog = Game.InventoryQuantityDialog.open(this, item, (quantity) => {
            this.quantityDialog = null;
            void Game.InventoryUseController.run(this, item, quantity);
        });
    }
    close() {
        this.requestId += 1;
        this.quantityDialog?.close();
        this.quantityDialog = null;
        window.GameNarrative.cancel();
        window.GameAudio.sfx('click');
        Game.EventBus.emit('tutorial-inventory-closed');
        Game.SceneTransition.fadeOut(this, () => {
            this.restoreBaseScenes();
            this.scene.stop();
        });
    }
    restoreBaseScenes() {
        if (this.baseScenesRestored) return;
        this.baseScenesRestored = true;
        this.scene.setVisible(true, 'GameScene');
        this.scene.setVisible(true, 'UIScene');
        this.scene.resume('GameScene');
        this.scene.resume('UIScene');
        Game.SceneTransition.fadeIn(this.scene.get('GameScene'));
        Game.SceneTransition.fadeIn(this.scene.get('UIScene'));
        window.GameModelUI.setMode('compact');
    }
    cleanup() {
        this.quantityDialog?.close();
        this.quantityDialog = null;
        window.GameCheatPanel?.close?.();
        Game.EventBus.off('inventory-changed', this.renderItems, this);
        this.restoreBaseScenes();
    }
};
