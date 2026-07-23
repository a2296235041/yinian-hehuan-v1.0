var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.ExplorationScene = class ExplorationScene extends Phaser.Scene {
    constructor() {
        super('ExplorationScene');
        this.regionObjects = [];
        this.statusText = null;
        this.playerInfoText = null;
        this.busy = false;
        this.requestId = 0;
        this.baseScenesRestored = false;
        this.assetsReady = false;
    }

    create() {
        this.baseScenesRestored = false;
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
        this.add.rectangle(18, 18, 320, 120, 0x0d1b17, 0.9)
            .setOrigin(0, 0)
            .setStrokeStyle(1, 0xd8c38c, 0.65);
        this.playerInfoText = this.add.text(32, 29, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '14px',
            color: '#f4ead2',
            lineSpacing: 5
        });
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
        Game.EventBus.on('cultivation-changed', this.refreshView, this);
        Game.EventBus.on('player-state-changed', this.refreshView, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.refreshView();
        Game.EnemyAssets.ensureLoaded(this).then(() => {
            if (!this.statusText?.active) return;
            this.assetsReady = true;
            this.statusText.setVisible(false);
            this.refreshView();
        }).catch((error) => {
            if (error.code === 'LOAD_CANCELLED') return;
            console.error('敌人素材加载失败:', error.message, error.stack);
            if (this.statusText?.active) this.statusText.setText('敌人图鉴加载失败，请返回后重试。').setVisible(true);
        });
        Game.SceneTransition.fadeIn(this);
    }

    refreshView() {
        this.renderPlayerInfo();
        if (!this.busy) this.renderRegions();
    }

    renderPlayerInfo() {
        const stats = window.GamePlayerStats.getSnapshot();
        const player = Game.player;
        this.playerInfoText.setText(
            `${stats.originName}　${stats.realmLabel}\n` +
            `精力 ${player.stamina}/${player.maxStamina}　气血 ${stats.maxHp}　攻击 ${stats.attack}\n` +
            `力量 ${stats.strength}　根骨 ${stats.constitution}　身法 ${stats.agility}\n` +
            `神识 ${stats.intelligence}　悟性 ${stats.wisdom}　气运 ${stats.luck}`
        );
    }

    renderRegions() {
        this.regionObjects.forEach((object) => object.destroy());
        this.regionObjects = [];
        window.GameExploration.getRegions().forEach((region, index) => {
            const column = index % 4;
            const row = Math.floor(index / 4);
            this.createRegionCard(region, 175 + column * 310, 260 + row * 255);
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
        if (!this.assetsReady) return this.statusText.setText('敌人图鉴正在加载，请稍候…').setVisible(true);
        if (this.busy) return;
        this.busy = true;
        frame.setAlpha(0.55);
        this.statusText.setText(`正在探索${region.name}…`);
        this.statusText.setVisible(true);
        try {
            const result = await window.GameExploration.explore(region.id);
            this.renderPlayerInfo();
            const requestId = ++this.requestId;
            this.statusText.setText(`${result.text || '探索结束。'}\nAI 正在补全遭遇…`);
            result.text = await Game.ExplorationNarrator.generate(region, result, (draft) => {
                if (requestId === this.requestId && this.statusText?.active) {
                    this.statusText.setText(draft);
                }
            });
            if (requestId !== this.requestId) return;
            this.statusText.setText(result.text);
            if (result.type === 'battle') {
                window.GameAudio.sfx('deny');
                Game.SceneTransition.fadeOut(this, () => {
                    this.scene.launch('BattleScene', { encounter: result });
                    this.scene.sleep();
                });
                return;
            }
            window.GameAudio.sfx(['error', 'locked', 'stamina'].includes(result.type)
                ? 'deny' : 'success');
        } finally {
            if (frame.active) frame.setAlpha(1);
            this.busy = false;
            this.renderRegions();
        }
    }

    handleBattleResult(result) {
        this.statusText.setText(result?.text || '战斗结束。').setVisible(true);
        this.renderPlayerInfo();
        this.renderRegions();
    }

    close() {
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
        this.requestId += 1;
        window.GameNarrative.cancel();
        Game.EventBus.off('exploration-result', this.handleBattleResult, this);
        Game.EventBus.off('cultivation-changed', this.refreshView, this);
        Game.EventBus.off('player-state-changed', this.refreshView, this);
        this.restoreBaseScenes();
    }
};
