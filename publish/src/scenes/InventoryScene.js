var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

// 储物袋采用独立覆盖场景，底层地图暂停，避免玩家查看物品时误点建筑。
Game.Scenes.InventoryScene = class InventoryScene extends Phaser.Scene {
    constructor() {
        super('InventoryScene');
        this.entryObjects = [];
        this.spiritStoneText = null;
    }

    create() {
        this.scene.pause('GameScene');
        this.scene.pause('UIScene');
        this.scene.setVisible(false, 'GameScene');
        this.scene.setVisible(false, 'UIScene');
        window.GameModelUI.setMode('hidden');
        this.add.image(640, 360, 'bg-sect').setDisplaySize(1280, 720);
        this.add.rectangle(640, 360, 1280, 720, 0x06100d, 0.8)
            .setInteractive();
        this.add.text(640, 54, '储物袋', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '38px',
            color: '#f4ead2'
        }).setOrigin(0.5);
        this.add.text(640, 94, '当前拥有的物品', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#a9c8bd'
        }).setOrigin(0.5);
        // 灵石属于常驻货币，不随普通物品列表刷新或为空提示移动。
        this.add.rectangle(62, 80, 244, 54, 0x14231f, 0.96)
            .setOrigin(0, 0)
            .setStrokeStyle(1, 0xd8c38c, 0.86);
        this.spiritStoneText = this.add.text(80, 96, '灵石　0', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '20px',
            color: '#f4ead2'
        });
        const close = this.add.text(1190, 48, '返回', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '20px',
            color: '#14231f',
            backgroundColor: '#f4ead2',
            padding: { x: 16, y: 9 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on('pointerdown', () => this.close());
        Game.EventBus.on('inventory-changed', this.renderItems, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        window.GameInventory.ready().then(() => this.renderItems());
        this.renderItems();
    }

    renderItems() {
        this.spiritStoneText?.setText(`灵石　${window.GameInventory.getSpiritStones()}`);
        this.entryObjects.forEach((object) => object.destroy());
        this.entryObjects = [];
        const items = window.GameInventory.getSnapshot().items
            .filter((item) => item.quantity > 0);
        if (!items.length) {
            this.entryObjects.push(this.add.text(640, 340, '储物袋空空如也', {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '24px',
                color: '#a9c8bd'
            }).setOrigin(0.5));
            return;
        }
        items.slice(0, 10).forEach((item, index) => {
            const column = index % 2;
            const row = Math.floor(index / 2);
            const x = column === 0 ? 360 : 920;
            const y = 150 + row * 96;
            this.entryObjects.push(this.add.rectangle(x, y + 34, 500, 78, 0x14231f, 0.92)
                .setStrokeStyle(1, 0x42685c, 0.9));
            this.entryObjects.push(this.add.text(x - 225, y + 10, item.name, {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '20px',
                color: '#d8c38c'
            }));
            this.entryObjects.push(this.add.text(x + 220, y + 10, `×${item.quantity}`, {
                fontFamily: 'serif',
                fontSize: '20px',
                color: '#f4ead2'
            }).setOrigin(1, 0));
            this.entryObjects.push(this.add.text(x - 225, y + 40, `${item.rarity} · ${item.description}`, {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '14px',
                color: '#a9c8bd',
                wordWrap: { width: 430 }
            }));
        });
    }

    close() {
        window.GameAudio.sfx('click');
        this.restoreBaseScenes();
        this.scene.stop();
    }

    restoreBaseScenes() {
        this.scene.setVisible(true, 'GameScene');
        this.scene.setVisible(true, 'UIScene');
        this.scene.resume('GameScene');
        this.scene.resume('UIScene');
        window.GameModelUI.setMode('compact');
    }

    cleanup() {
        Game.EventBus.off('inventory-changed', this.renderItems, this);
        this.restoreBaseScenes();
    }
};
