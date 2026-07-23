var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.ExplorationScene = class ExplorationScene extends Phaser.Scene {
    constructor() {
        super('ExplorationScene');
        this.regionObjects = [];
        this.statusText = null;
        this.busy = false;
    }

    create() {
        this.scene.pause('GameScene');
        this.scene.pause('UIScene');
        this.scene.setVisible(false, 'GameScene');
        this.scene.setVisible(false, 'UIScene');
        window.GameModelUI.setMode('hidden');
        this.add.image(640, 360, 'bg-sect-map').setDisplaySize(1280, 720);
        this.add.rectangle(640, 360, 1280, 720, 0x06100d, 0.72).setInteractive();
        this.add.text(640, 42, '出山探险', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '36px',
            color: '#f4ead2'
        }).setOrigin(0.5);
        const close = this.add.text(1200, 42, '返回宗门', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '18px',
            color: '#14231f',
            backgroundColor: '#f4ead2',
            padding: { x: 14, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on('pointerdown', () => this.close());
        this.statusText = this.add.text(640, 674, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '18px',
            color: '#f4ead2',
            backgroundColor: 'rgba(13,27,23,0.92)',
            padding: { x: 18, y: 10 },
            wordWrap: { width: 1040 }
        }).setOrigin(0.5).setVisible(false);
        Game.EventBus.on('exploration-result', this.handleBattleResult, this);
        Game.EventBus.on('cultivation-changed', this.renderRegions, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.renderRegions();
    }

    renderRegions() {
        this.regionObjects.forEach((object) => object.destroy());
        this.regionObjects = [];
        window.GameExploration.getRegions().forEach((region, index) => {
            const column = index % 4;
            const row = Math.floor(index / 4);
            this.createRegionCard(region, 175 + column * 310, 205 + row * 285);
        });
    }

    createRegionCard(region, x, y) {
        const color = region.unlocked ? 0x14231f : 0x101714;
        const frame = this.add.rectangle(x, y, 270, 230, color, 0.94)
            .setStrokeStyle(2, region.unlocked ? 0xd8c38c : 0x42685c, 0.85);
        const title = this.add.text(x, y - 82, region.name, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '23px',
            color: region.unlocked ? '#f4ead2' : '#789087'
        }).setOrigin(0.5);
        const requirement = region.unlocked
            ? `险度 ${region.danger} · 精力 -${region.stamina_cost}`
            : `${window.GameCultivation.getRealmName(region.required_realm)}解锁`;
        const detail = this.add.text(x, y - 44, requirement, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '14px',
            color: region.unlocked ? '#d8c38c' : '#789087'
        }).setOrigin(0.5);
        const description = this.add.text(x, y + 6, region.description, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '15px',
            color: region.unlocked ? '#a9c8bd' : '#64766f',
            align: 'center',
            lineSpacing: 5,
            wordWrap: { width: 226, useAdvancedWrap: true }
        }).setOrigin(0.5);
        this.regionObjects.push(frame, title, detail, description);
        if (!region.unlocked) return;
        frame.setInteractive({ useHandCursor: true });
        frame.on('pointerdown', () => this.chooseRegion(region, frame));
    }

    async chooseRegion(region, frame) {
        if (this.busy) return;
        this.busy = true;
        frame.setAlpha(0.55);
        this.statusText.setText(`正在探索${region.name}…`);
        this.statusText.setVisible(true);
        try {
            const result = await window.GameExploration.explore(region.id);
            this.statusText.setText(result.text || '探索结束。');
            if (result.type === 'battle') {
                window.GameAudio.sfx('deny');
                this.scene.launch('BattleScene', { encounter: result });
                this.scene.sleep();
                return;
            }
            window.GameAudio.sfx(['error', 'locked', 'stamina'].includes(result.type)
                ? 'deny' : 'success');
        } finally {
            frame.setAlpha(1);
            this.busy = false;
        }
    }

    handleBattleResult(result) {
        this.statusText.setText(result?.text || '战斗结束。').setVisible(true);
        this.renderRegions();
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
        Game.EventBus.off('exploration-result', this.handleBattleResult, this);
        Game.EventBus.off('cultivation-changed', this.renderRegions, this);
        this.restoreBaseScenes();
    }
};
