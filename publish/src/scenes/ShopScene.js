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
        Game.UISkin.addPanel(this, 640, 365, 1180, 630, 'card', { alpha: 0.95 });
        const shop = window.GameShop.getShop(this.buildingId);
        this.add.text(640, 46, shop?.name || '灵石商店', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '36px',
            color: '#fff8fa'
        }).setOrigin(0.5);
        this.stoneText = this.add.text(54, 42, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '21px',
            color: '#f0a8bb',
            backgroundColor: 'rgba(50,21,34,0.92)',
            padding: { x: 14, y: 9 }
        });
        Game.UISkin.makeButton(this, 1170, 50, '返回', () => this.close(), {
            width: 120, height: 46, fontSize: 18, variant: 'secondary'
        });
        this.statusText = this.add.text(640, 670, '正在整理货架…', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '17px',
            color: '#fff8fa',
            backgroundColor: 'rgba(50,21,34,0.94)',
            padding: { x: 18, y: 9 },
            wordWrap: { width: 1000, useAdvancedWrap: true },
            fixedWidth: 1050,
            fixedHeight: 58,
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
        this.stoneText?.setText(`灵石 ${window.GameInventory.getSpiritStones()}`);
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
        shop.offers.forEach((offer, index) => this.createProduct(offer, index));
    }

    createProduct(offer, index) {
        const x = index % 2 === 0 ? 350 : 930;
        const y = index < 2 ? 230 : 490;
        const frame = Game.UISkin.addPanel(this, x, y, 520, 210, 'card', {
            alpha: 0.96
        });
        const title = this.add.text(x - 230, y - 78, offer.item.name, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '22px',
            color: '#f0a8bb'
        });
        const detail = this.add.text(x - 230, y - 38,
            `${offer.item.rarity} · ${window.GameShop.effectLabel(offer.item)}\n${offer.item.description}`, {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '15px',
                color: '#f4dfe5',
                lineSpacing: 6,
                wordWrap: { width: 450, useAdvancedWrap: true }
            });
        const button = Game.UISkin.makeButton(
            this, x, y + 70, `购买 · ${offer.price} 灵石`,
            (target) => this.openPurchaseDialog(offer, target),
            { width: 230, height: 46, fontSize: 17 }
        );
        this.productObjects.push(frame, title, detail, button);
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
        if (this.busy) window.GameNarrative.cancel();
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
