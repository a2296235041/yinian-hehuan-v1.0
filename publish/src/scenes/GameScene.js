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
