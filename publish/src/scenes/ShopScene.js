var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.ShopScene = class ShopScene extends Phaser.Scene {
    constructor() {
        super('ShopScene');
        this.buildingId = null;
        this.productObjects = [];
        this.stoneText = null;
        this.statusText = null;
        this.busy = false;
        this.baseScenesRestored = false;
        this.requestId = 0;
        this.quantityDialog = null;
    }

    init(data = {}) {
        this.buildingId = data.buildingId || null;
        this.busy = false;
        this.baseScenesRestored = false;
    }

    create() {
        this.scene.pause('GameScene');
        this.scene.pause('UIScene');
        this.scene.setVisible(false, 'GameScene');
        this.scene.setVisible(false, 'UIScene');
        window.GameModelUI.setMode('hidden');
        this.add.image(640, 360, 'bg-sect').setDisplaySize(1280, 720);
        this.add.rectangle(640, 360, 1280, 720, 0x06100d, 0.84).setInteractive();
        const shop = window.GameShop.getShop(this.buildingId);
        Game.CommerceDecor.createShell(
            this, shop?.name || '灵石商店', `${shop?.keeper || '掌柜'} · 灵物有价，取用有度`
        );
        this.stoneText = Game.CommerceDecor.addCurrency(this, 174, 113);
        Game.UISkin.makeButton(this, 1170, 50, '返回', () => this.close(), {
            width: 120, height: 46, fontSize: 18, variant: 'secondary'
        });
        this.statusText = this.add.text(640, 652, '正在整理货架…', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '17px',
            color: '#fff8fa',
            backgroundColor: 'rgba(50,21,34,0.94)',
            padding: { x: 18, y: 9 },
            wordWrap: { width: 1000, useAdvancedWrap: true },
            fixedWidth: 900,
            fixedHeight: 46,
            align: 'center'
        }).setOrigin(0.5);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        Game.EventBus.on('inventory-changed', this.refreshBalance, this);
        Game.systemsReady.then(() => this.renderShop()).catch((error) => {
            console.error('商店初始化失败:', error.code || '', error.message, error.stack);
            this.statusText.setText('商店暂时无法营业，请返回后重试。');
        });
        Game.SceneTransition.fadeIn(this);
    }

    refreshBalance() {
        this.stoneText?.setText(
            Game.CommerceDecor.formatNumber(window.GameInventory.getSpiritStones())
        );
    }

    renderShop() {
        this.productObjects.forEach((object) => object.destroy());
        this.productObjects = [];
        this.refreshBalance();
        const shop = window.GameShop.getShop(this.buildingId);
        if (!shop?.offers.length) {
            this.statusText.setText('此处暂时没有可出售的物品。');
            return;
        }
        this.statusText.setText(`${shop.keeper}正在看守货架。`);
        Game.ShopGridView.render(this, shop.offers);
    }

    openPurchaseDialog(offer, button) {
        if (this.busy) return;
        this.quantityDialog?.close();
        this.quantityDialog = Game.ShopQuantityDialog.open(this, offer, (quantity) => {
            this.quantityDialog = null;
            void Game.ShopPurchaseController.run(this, offer, button, quantity);
        });
        if (!this.quantityDialog) {
            window.GameAudio.sfx('deny');
            this.statusText.setText(
                window.GameInventory.getQuantity(offer.itemId) >= 9999
                    ? '该物品已达到背包上限。'
                    : '灵石不足，无法购买此物。'
            );
        }
    }

    close() {
        this.requestId += 1;
        this.quantityDialog?.close();
        this.quantityDialog = null;
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
        Game.EventBus.off('inventory-changed', this.refreshBalance, this);
        this.restoreBaseScenes();
    }
};
