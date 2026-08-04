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
        this.add.image(640, 360, 'bg-sect').setDisplaySize(1280, 720);
        this.add.rectangle(640, 360, 1280, 720, 0x06100d, 0.8)
            .setInteractive();
        Game.UISkin.addPanel(this, 640, 370, 1180, 620, 'card', { alpha: 0.94 });
        this.add.text(640, 54, '储物袋', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '38px',
            color: '#fff8fa'
        }).setOrigin(0.5);
        this.add.text(640, 94, '当前拥有的物品', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#f4dfe5'
        }).setOrigin(0.5);
        // 灵石属于常驻货币，不随普通物品列表刷新或为空提示移动。
        Game.UISkin.addPanel(this, 184, 107, 244, 54, 'wide', { alpha: 0.96 });
        this.spiritStoneText = this.add.text(80, 96, '灵石　0', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '20px',
            color: '#fff8fa'
        });
        Game.UISkin.makeButton(this, 1170, 54, '返回', () => this.close(), {
            width: 120, height: 46, fontSize: 19, variant: 'secondary'
        });
        this.useStatusText = this.add.text(640, 606, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#f0a8bb'
        }).setOrigin(0.5);
        this.makePageButton(555, '<', -1);
        this.pageText = this.add.text(640, 660, '', {
            fontFamily: 'serif',
            fontSize: '17px',
            color: '#fff8fa'
        }).setOrigin(0.5);
        this.makePageButton(725, '>', 1);
        const guideButton = this.add.text(1184, 660, '⚙', {
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
        this.spiritStoneText?.setText(`灵石　${window.GameInventory.getSpiritStones()}`);
        this.entryObjects.forEach((object) => object.destroy());
        this.entryObjects = [];
        const items = window.GameInventory.getSnapshot().items
            .filter((item) => item.quantity > 0);
        const pageCount = Math.max(1, Math.ceil(items.length / 8));
        this.page = Math.min(this.page, pageCount - 1);
        this.pageText?.setText(`${this.page + 1} / ${pageCount}`);
        if (!items.length) {
            this.entryObjects.push(this.add.text(640, 340, '储物袋空空如也', {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '24px',
                color: '#f4dfe5'
            }).setOrigin(0.5));
            return;
        }
        items.slice(this.page * 8, this.page * 8 + 8).forEach((item, index) => {
            const column = index % 2;
            const row = Math.floor(index / 2);
            const x = column === 0 ? 360 : 920;
            const y = 150 + row * 108;
            this.entryObjects.push(Game.UISkin.addPanel(
                this, x, y + 38, 500, 88, 'wide', { alpha: 0.94 }
            ));
            this.entryObjects.push(this.add.text(x - 225, y + 10, item.name, {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '20px',
                color: '#f0a8bb'
            }));
            this.entryObjects.push(this.add.text(x + 220, y + 10, `×${item.quantity}`, {
                fontFamily: 'serif',
                fontSize: '20px',
                color: '#fff8fa'
            }).setOrigin(1, 0));
            this.entryObjects.push(this.add.text(x - 225, y + 40, `${item.rarity} · ${item.description}`, {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '14px',
                color: '#f4dfe5',
                wordWrap: { width: 350 }
            }));
            if (['cultivation', 'attribute'].includes(item.type)) {
                const use = Game.UISkin.makeButton(
                    this, x + 185, y + 55, '使用', () => this.openUseDialog(item),
                    { width: 82, height: 44, fontSize: 14 }
                );
                this.entryObjects.push(use);
            }
        });
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
