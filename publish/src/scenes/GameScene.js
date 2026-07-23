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
    }

    init(data) {
        this.playerData = data.playerOrigin || null;
    }

    create() {
        window.GameModelUI.setMode('compact');
        this.npcSystem = new Game.NPCSystem(this);
        this.npcSystem.init();
        Game.systemsReady = window.GamePlayerState.initialize(
            this,
            this.playerData,
            this.npcSystem
        );
        this.dialogueSystem = new Game.DialogueSystem(this, this.npcSystem);
        this.showSectMap();
        this.scene.launch('UIScene');
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

    addCoverBackground(key, shade) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const background = this.addViewObject(this.add.image(width / 2, height / 2, key));
        background.setScale(Math.max(width / background.width, height / background.height));
        this.addViewObject(this.add.rectangle(width / 2, height / 2, width, height, 0x07100d, shade));
    }

    showSectMap() {
        this.clearView();
        this.currentBuilding = null;
        this.addCoverBackground('bg-sect-map', 0.18);
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
        this.addCoverBackground('bg-sect', 0.52);
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

        const npcs = building.npcIds
            .map((id) => this.npcSystem.getNpcDataById(id))
            .filter(Boolean);
        const gap = 270;
        const startX = 640 - ((npcs.length - 1) * gap) / 2;
        npcs.forEach((npc, index) => this.createNpcCard(npc, startX + index * gap));
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

    getPortraitKey(npcId) {
        if (npcId === 'hu_jiuer') return 'npc-fox';
        if (['liu_hanyan', 'han_yueshuang', 'xiao_qingxuan'].includes(npcId)) {
            return 'npc-master';
        }
        return 'npc-scholar';
    }

    createNpcCard(npc, x) {
        const affinity = this.npcSystem.getNpcStateById(npc.id);
        const frame = this.addViewObject(this.add.rectangle(x, 360, 226, 388, 0x0d1b17, 0.9)
            .setStrokeStyle(2, 0xd8c38c, 0.75));
        const portrait = this.addViewObject(this.add.image(x, 335, this.getPortraitKey(npc.id)));
        portrait.setScale(Math.min(170 / portrait.width, 260 / portrait.height));
        this.addViewObject(this.add.text(x, 507, npc.name, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '24px',
            color: '#f4ead2'
        }).setOrigin(0.5));
        this.addViewObject(this.add.text(x, 542, npc.title, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#d8c38c'
        }).setOrigin(0.5));
        const affinityText = this.addViewObject(this.add.text(
            x, 582, `好感 ${affinity.affinity} · 点击交谈`, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#cde9df'
        }).setOrigin(0.5));
        const updateAffinity = (data) => {
            if (data.npcId === npc.id) affinityText.setText(`好感 ${data.affinity} · 点击交谈`);
        };
        Game.EventBus.on('affinity-changed', updateAffinity);
        affinityText.once(Phaser.GameObjects.Events.DESTROY, () => {
            Game.EventBus.off('affinity-changed', updateAffinity);
        });

        const hitArea = this.addViewObject(
            this.add.zone(x, 360, 226, 388).setInteractive({ useHandCursor: true })
        );
        hitArea.on('pointerdown', () => {
            window.GameAudio.sfx('click');
            this.tweens.add({ targets: frame, alpha: 0.55, duration: 80, yoyo: true });
            this.dialogueSystem.startDialogue(npc.id);
        });
    }
};
