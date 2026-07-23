var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.GameScene = class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.playerData = null;
        this.npcSystem = null;
        this.dialogueSystem = null;
    }

    init(data) {
        this.playerData = data.playerOrigin || null;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const background = this.add.image(width / 2, height / 2, 'bg-sect');
        background.setScale(Math.max(width / background.width, height / background.height));
        this.add.rectangle(width / 2, height / 2, width, height, 0x07100d, 0.26);

        this.npcSystem = new Game.NPCSystem(this);
        this.npcSystem.init();
        this.dialogueSystem = new Game.DialogueSystem(this, this.npcSystem);

        Game.player = {
            origin: this.playerData,
            cultivation: 10,
            maxStamina: 12,
            stamina: 12,
            day: 1,
            maxDailyCultivation: 5,
            dailyCultivationCount: 5
        };

        this.createNpcObjects();
        this.scene.launch('UIScene');
    }

    getPortraitKey(npcId) {
        if (npcId === 'hu_jiuer') return 'npc-fox';
        if (['liu_hanyan', 'han_yueshuang', 'xiao_qingxuan'].includes(npcId)) {
            return 'npc-master';
        }
        return 'npc-scholar';
    }

    createNpcObjects() {
        const npcs = Array.from(this.npcSystem.getAllNpcs().values());
        const spacingX = 205;
        const spacingY = 190;
        const startX = (this.cameras.main.width - spacingX * 2) / 2;
        const startY = 145;

        npcs.forEach((npc, index) => {
            const x = startX + (index % 3) * spacingX;
            const y = startY + Math.floor(index / 3) * spacingY;
            const frame = this.add.rectangle(x, y, 142, 166, 0x0d1b17, 0.82)
                .setStrokeStyle(2, 0xd8c38c, 0.68);
            const portrait = this.add.image(x, y + 6, this.getPortraitKey(npc.id))
                .setDisplaySize(136, 136)
                .setInteractive({ useHandCursor: true });

            this.add.text(x, y - 91, npc.title, {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '15px',
                color: '#d8c38c'
            }).setOrigin(0.5);
            this.add.text(x, y + 94, npc.name, {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '18px',
                color: '#f4ead2',
                backgroundColor: 'rgba(13,27,23,0.82)',
                padding: { x: 8, y: 3 }
            }).setOrigin(0.5);

            portrait.on('pointerdown', () => {
                window.GameAudio.sfx('click');
                this.tweens.add({ targets: frame, alpha: 0.5, duration: 80, yoyo: true });
                this.dialogueSystem.startDialogue(npc.id);
            });
        });
    }
};
