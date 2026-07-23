var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.GameScene = class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.playerData = null;
        this.npcSystem = null;
        this.dialogueSystem = null;
        this.viewObjects = [];
        this.currentBuilding = null;
        this.backdrop = null;
        this.savedSnapshot = null;
        this.newGame = false;
    }

    init(data) {
        this.playerData = data.playerOrigin || null;
        this.savedSnapshot = data.saveSnapshot || null;
        this.newGame = data.newGame === true;
    }

    create() {
        window.GameModelUI.setMode('compact');
        this.npcSystem = new Game.NPCSystem(this);
        this.npcSystem.init();
        Game.systemsReady = window.GamePlayerState.initialize(
            this,
            this.playerData,
            this.npcSystem,
            this.savedSnapshot,
            this.newGame
        );
        this.dialogueSystem = new Game.DialogueSystem(this, this.npcSystem);
        Game.EventBus.on('time-period-changed', this.refreshLighting, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.showSectMap();
        Game.SceneTransition.fadeIn(this);
        this.scene.launch('UIScene');
        if (this.savedSnapshot) {
            Game.systemsReady.then(() => this.showSavedLocation(this.savedSnapshot.location));
        }
    }

    addViewObject(object) {
        this.viewObjects.push(object);
        return object;
    }

    clearView() {
        if (this.dialogueSystem?.isActive()) this.dialogueSystem.endDialogue();
        this.viewObjects.forEach((object) => object.destroy());
        this.viewObjects = [];
    }

    refreshLighting() {
        Game.SceneBackdrop.applyPeriod(this.backdrop);
    }

    cleanup() {
        Game.EventBus.off('time-period-changed', this.refreshLighting, this);
    }

    showSectMap() {
        this.clearView();
        this.currentBuilding = null;
        this.backdrop = Game.SceneBackdrop.create(this, 'bg-sect-map', 0.08);
        this.addViewObject(this.add.text(640, 38, '合欢宗 · 山门总览', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '32px',
            color: '#f4ead2',
            stroke: '#14231f',
            strokeThickness: 4
        }).setOrigin(0.5));
        Game.Data.buildings.forEach((building) => this.createBuildingMarker(building));
        this.createPrivateSceneArrow();
    }

    createBuildingMarker(building) {
        const marker = this.addViewObject(
            this.add.rectangle(building.mapX, building.mapY, 210, 142, 0x0d1b17, 0.28)
                .setStrokeStyle(2, 0xf4ead2, 0.82)
                .setInteractive({ useHandCursor: true })
        );
        this.addViewObject(this.add.text(building.mapX, building.mapY + 48, building.name, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '22px',
            color: '#f4ead2',
            backgroundColor: 'rgba(13,27,23,0.88)',
            padding: { x: 12, y: 6 }
        }).setOrigin(0.5));
        this.addViewObject(this.add.text(
            building.mapX,
            building.mapY + 85,
            `${building.npcIds.length} 位人物`,
            {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '14px',
                color: '#d8c38c',
                backgroundColor: 'rgba(13,27,23,0.78)',
                padding: { x: 7, y: 3 }
            }
        ).setOrigin(0.5));
        marker.on('pointerdown', () => {
            window.GameAudio.sfx('click');
            this.showBuilding(building);
        });
    }

    createPrivateSceneArrow() {
        // 箭头放在山门总览右侧中部，避开顶部操作栏和右上角设置按钮。
        const arrow = this.addViewObject(this.add.text(1244, 360, '▶', {
            fontFamily: 'serif',
            fontSize: '42px',
            color: '#f4ead2',
            backgroundColor: 'rgba(13,27,23,0.72)',
            padding: { x: 9, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        arrow.setStroke('#14231f', 2);
        arrow.on('pointerdown', () => this.openPrivateScene());
    }

    openPrivateScene() {
        if (this.scene.isActive('PrivateScene')) return;
        window.GameAudio.sfx('click');
        Game.SceneTransition.fadeOut(this, () => {
            this.scene.pause('GameScene');
            this.scene.pause('UIScene');
            this.scene.setVisible(false, 'GameScene');
            this.scene.setVisible(false, 'UIScene');
            window.GameModelUI.setMode('hidden');
            this.scene.launch('PrivateScene', { sceneIndex: 0 });
        });
    }

    showBuilding(building) {
        this.clearView();
        this.currentBuilding = building;
        this.backdrop = Game.SceneBackdrop.create(this, 'bg-sect', 0.22);
        Game.BuildingAssets.apply(this, building, this.backdrop);
        this.addViewObject(this.add.text(640, 58, building.name, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '36px',
            color: '#f4ead2',
            stroke: '#14231f',
            strokeThickness: 4
        }).setOrigin(0.5));
        this.addViewObject(this.add.text(640, 106, building.description, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '17px',
            color: '#d8c38c',
            wordWrap: { width: 760 },
            align: 'center'
        }).setOrigin(0.5));
        this.createBackButton();
        Game.ShopEntry.create(this, building);
        const npcs = building.npcIds
            .map((id) => this.npcSystem.getNpcDataById(id))
            .filter(Boolean);
        const gap = 270;
        const startX = 640 - ((npcs.length - 1) * gap) / 2;
        npcs.forEach((npc, index) => {
            Game.NpcCardRenderer.create(this, npc, startX + index * gap);
        });
    }

    showSavedLocation(location) {
        const building = Game.Data.buildings.find((item) => item.id === location?.buildingId);
        if (building) this.showBuilding(building);
        else this.showSectMap();
    }

    createBackButton() {
        const button = this.addViewObject(this.add.text(780, 58, '返回地图', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '18px',
            color: '#14231f',
            backgroundColor: '#f4ead2',
            padding: { x: 15, y: 9 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        button.on('pointerdown', () => {
            window.GameAudio.sfx('click');
            this.showSectMap();
        });
    }

};

/**
 * 玩家私人场景。
 * 六处地点共享同一个场景控制器，只切换背景与地点文案，不复制六套交互逻辑。
 */
Game.Scenes.PrivateScene = class PrivateScene extends Phaser.Scene {
    constructor() {
        super('PrivateScene');
        this.locations = [
            {
                name: '静修洞府',
                description: '属于你的清幽洞府，适合闭关、品茶，也适合与信赖之人安静相处。',
                key: 'bg-private-cave',
                path: './assets/generated/bg-private-cave.07089792.webp'
            },
            {
                name: '听竹林',
                description: '竹影随风，灵气在叶间流转，是适合谈心与调息的清静所在。',
                key: 'bg-private-bamboo',
                path: './assets/generated/bg-private-bamboo.ab733237.webp'
            },
            {
                name: '云雾温泉',
                description: '山泉温润，雾气常年不散，疲惫时可来此洗去尘劳。',
                key: 'bg-private-hot-spring',
                path: './assets/generated/bg-private-hot-spring.adae3403.webp'
            },
            {
                name: '花灵台',
                description: '灵花在云台上四季不谢，花香会随来客的心境改变。',
                key: 'bg-private-flower-terrace',
                path: './assets/generated/bg-private-flower-terrace.8c4921b4.webp'
            },
            {
                name: '月影水榭',
                description: '临水而建的观月小榭，夜深时能听见远山灵泉的回声。',
                key: 'bg-private-moon-pavilion',
                path: './assets/generated/bg-private-moon-pavilion.d9418dfc.webp'
            },
            {
                name: '灵植药圃',
                description: '你亲手打理的灵植园，药香清润，适合整理收获与规划修行。',
                key: 'bg-private-spirit-garden',
                path: './assets/generated/bg-private-spirit-garden.6a80bf37.webp'
            }
        ];
        this.sceneIndex = 0;
        this.background = null;
        this.titleText = null;
        this.descriptionText = null;
        this.statusText = null;
        this.inviteObjects = [];
        this.locationObjects = [];
        this.busy = false;
        this.npcSystem = null;
    }

    init(data) {
        const index = Math.floor(Number(data?.sceneIndex) || 0);
        this.sceneIndex = (index + this.locations.length) % this.locations.length;
    }

    create() {
        const base = this.scene.get('GameScene');
        this.npcSystem = base.npcSystem;
        this.background = this.add.image(640, 360, 'bg-sect-map')
            .setDisplaySize(1280, 720);
        this.add.rectangle(640, 360, 1280, 720, 0x06100d, 0.4);
        this.add.rectangle(70, 125, 1140, 410, 0x0d1b17, 0.58)
            .setStrokeStyle(1, 0xd8c38c, 0.62);
        this.titleText = this.add.text(640, 54, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '34px',
            color: '#f4ead2',
            stroke: '#14231f',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.descriptionText = this.add.text(640, 102, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#d8c38c',
            wordWrap: { width: 760 },
            align: 'center'
        }).setOrigin(0.5);
        this.createLocationArrow(58, 96, '◀', -1);
        this.createLocationArrow(1222, 96, '▶', 1);
        this.add.text(640, 151, '邀请 NPC 双修', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '20px',
            color: '#f4ead2'
        }).setOrigin(0.5);
        this.statusText = this.add.text(640, 560, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '17px',
            color: '#f4ead2',
            backgroundColor: 'rgba(9,16,14,0.88)',
            padding: { x: 14, y: 8 },
            wordWrap: { width: 900 },
            align: 'center'
        }).setOrigin(0.5).setVisible(false);
        this.createLocationButtons();
        this.createCloseButton();
        Game.EventBus.on('affinity-changed', this.renderInvites, this);
        Game.EventBus.on('cultivation-changed', this.renderInvites, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.renderLocation();
        this.renderInvites();
        this.loadLocationBackgrounds();
        Game.SceneTransition.fadeIn(this);
    }

    createLocationArrow(x, y, label, offset) {
        const arrow = this.add.text(x, y, label, {
            fontFamily: 'serif',
            fontSize: '30px',
            color: '#14231f',
            backgroundColor: '#f4ead2',
            padding: { x: 9, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        arrow.on('pointerdown', () => {
            if (this.busy) return;
            this.sceneIndex = (this.sceneIndex + offset + this.locations.length)
                % this.locations.length;
            window.GameAudio.sfx('click');
            this.renderLocation();
        });
    }

    createLocationButtons() {
        this.locations.forEach((location, index) => {
            const button = this.add.text(100 + index * 205, 650, location.name, {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '16px',
                color: '#14231f',
                backgroundColor: '#f4ead2',
                padding: { x: 10, y: 7 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            button.on('pointerdown', () => {
                if (this.busy) return;
                this.sceneIndex = index;
                window.GameAudio.sfx('click');
                this.renderLocation();
            });
            this.locationObjects.push(button);
        });
    }

    createCloseButton() {
        const close = this.add.text(1138, 54, '返回山门', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '17px',
            color: '#14231f',
            backgroundColor: '#f4ead2',
            padding: { x: 13, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on('pointerdown', () => this.close());
    }

    renderLocation() {
        const location = this.locations[this.sceneIndex];
        this.titleText.setText(`私人场景 · ${location.name}`);
        this.descriptionText.setText(location.description);
        this.locationObjects.forEach((button, index) => {
            button.setAlpha(index === this.sceneIndex ? 1 : 0.62);
        });
        if (this.textures.exists(location.key)) {
            this.background.setTexture(location.key).setDisplaySize(1280, 720);
        }
    }

    loadLocationBackgrounds() {
        const missing = this.locations.filter((location) => !this.textures.exists(location.key));
        if (!missing.length) return;
        this.statusText.setText('正在布置私人场景…').setVisible(true);
        missing.forEach((location) => this.load.image(location.key, location.path));
        this.load.once('complete', () => {
            if (!this.statusText?.active) return;
            this.statusText.setVisible(false);
            this.renderLocation();
        });
        this.load.on('loaderror', (file) => {
            console.error('私人场景背景加载失败:', file.key, file.src);
        });
        this.load.start();
    }

    renderInvites() {
        if (!this.npcSystem?.getAllNpcs) return;
        this.inviteObjects.forEach((object) => object.destroy());
        this.inviteObjects = [];
        [...this.npcSystem.getAllNpcs().values()].forEach((npc, index) => {
            const affinity = window.GameAffinity.getSnapshot(npc.id);
            const available = affinity.affinity >= 80;
            const column = index % 3;
            const row = Math.floor(index / 3);
            const button = this.add.text(250 + column * 390, 205 + row * 78,
                `${npc.name} · 好感 ${affinity.affinity}\n${available ? '可邀请双修' : '好感需达到 80'}`, {
                    fontFamily: '"Noto Serif SC", serif',
                    fontSize: '15px',
                    color: available ? '#14231f' : '#789087',
                    backgroundColor: available ? '#d8c38c' : '#14231f',
                    padding: { x: 12, y: 7 },
                    align: 'center'
                }).setOrigin(0.5);
            if (available) {
                button.setInteractive({ useHandCursor: true });
                button.on('pointerdown', () => this.inviteNpc(npc));
            }
            this.inviteObjects.push(button);
        });
    }

    async inviteNpc(npc) {
        if (this.busy) return;
        const affinity = window.GameAffinity.getSnapshot(npc.id);
        if (affinity.affinity < 80) {
            this.statusText.setText(`${npc.name} 当前还不愿与你进行双修。`).setVisible(true);
            return;
        }
        this.busy = true;
        this.statusText.setText(`正在邀请${npc.name}，AI 正在生成双修剧情…`).setVisible(true);
        try {
            const cultivation = window.GameCultivation.getSnapshot();
            let result;
            if (cultivation.canBreakthrough) {
                result = await window.GameCultivation.breakthrough(npc.id, affinity.affinity);
            } else if (Game.player.stamina > 0) {
                Game.player.stamina -= 1;
                result = await window.GameCultivation.addCultivationPercent(
                    3, 'dual_cultivation'
                );
                Game.EventBus.emit('player-state-changed', { player: { ...Game.player } });
            } else {
                result = { changed: false, reason: 'stamina' };
            }
            const fallback = result.changed
                ? (cultivation.canBreakthrough
                    ? `你与${npc.name}完成双修，成功突破至${result.snapshot.realmName}。`
                    : `你与${npc.name}静心双修，当前境界修为增加 ${result.gain}。`)
                : (result.reason === 'stamina'
                    ? '精力不足，暂时无法维持双修。'
                    : '当前修为状态暂时不适合继续双修。');
            const story = await window.GameNarrative.generateDetailed('dual_cultivation', {
                npc: npc.name,
                npcTitle: npc.title,
                npcRealm: npc.realm_label,
                affinity: affinity.affinity,
                playerRealm: window.GameCultivation.getSnapshot().label,
                result: fallback
            }, fallback);
            window.GameAudio.sfx(result.changed ? 'success' : 'deny');
            this.statusText.setText(`${npc.name}：${story}`).setVisible(true);
        } catch (error) {
            console.error('私人场景双修失败:', error.code || '', error.message, error.stack);
            this.statusText.setText('双修暂时无法完成，请稍后再试。').setVisible(true);
        } finally {
            this.busy = false;
            this.renderInvites();
        }
    }

    close() {
        if (this.busy) return;
        window.GameAudio.sfx('click');
        Game.SceneTransition.fadeOut(this, () => {
            const gameScene = this.scene.get('GameScene');
            const uiScene = this.scene.get('UIScene');
            this.scene.setVisible(true, 'GameScene');
            this.scene.setVisible(true, 'UIScene');
            this.scene.resume('GameScene');
            this.scene.resume('UIScene');
            this.scene.stop();
            window.GameModelUI.setMode('compact');
            Game.SceneTransition.fadeIn(gameScene);
            Game.SceneTransition.fadeIn(uiScene);
        });
    }

    cleanup() {
        window.GameNarrative.cancel();
        Game.EventBus.off('affinity-changed', this.renderInvites, this);
        Game.EventBus.off('cultivation-changed', this.renderInvites, this);
    }
};
