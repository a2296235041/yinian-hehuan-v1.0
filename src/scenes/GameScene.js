/**
 * @file GameScene.js
 * @description 核心游戏场景
 * 这是游戏的主要舞台，玩家将在这里进行探索、交互、战斗等所有核心活动。
 */

var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.GameScene = class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.playerData = null;
        this.npcSystem = null;
        this.dialogueSystem = null; // 对话系统实例
    }

    /**
     * init() 在场景启动时调用，用于接收数据。
     * @param {object} data - 从上一个场景（CharacterCreationScene）传递过来的数据。
     */
    init(data) {
        // 保存从角色创建场景传递过来的玩家所选身份数据
        this.playerData = data.playerOrigin;
        console.log('GameScene: init, 玩家数据已接收', this.playerData);
    }

    preload() {
        console.log('GameScene: preload');
        // 如果GameScene需要加载独有的资源，可以在这里进行
        // 但通常大部分资源都应在PreloadScene中加载完毕
    }

    create() {
        console.log('GameScene: create');

        // 1. 添加一个简单的背景
        this.cameras.main.setBackgroundColor('#5c946e');

        // 2. 初始化核心系统
        this.npcSystem = new Game.NPCSystem(this);
        this.npcSystem.init();
        this.dialogueSystem = new Game.DialogueSystem(this, this.npcSystem);

        // 3. 初始化玩家核心数据
        if (!Game.player) {
            Game.player = {
                origin: this.playerData,
                cultivation: 10,
                maxStamina: 12,
                stamina: 12,
                day: 1,
                maxDailyCultivation: 5,
                dailyCultivationCount: 5
            };
            console.log('玩家数据已初始化:', Game.player);
        }

        // 4. 创建NPC游戏对象
        this.createNpcObjects();

        // 5. 启动并行的UI场景
        this.scene.launch('UIScene');
    }

    /**
     * 根据NPC数据创建场景中的游戏对象
     */
    createNpcObjects() {
        const allNpcs = Array.from(this.npcSystem.getAllNpcs().values());
        const cols = 3; // 3列
        const total = allNpcs.length;
        
        const npcWidth = 100;
        const npcHeight = 150;
        const spacingX = 150;
        const spacingY = 220;
        const startX = (this.cameras.main.width - (cols - 1) * spacingX) / 2;
        const startY = 180;

        allNpcs.forEach((npcData, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;

            const x = startX + col * spacingX;
            const y = startY + row * spacingY;

            // 创建一个随机颜色的矩形代表NPC
            const npcColor = Phaser.Display.Color.RandomRGB(100, 255).color;

            const npcObject = this.add.rectangle(x, y, npcWidth, npcHeight, npcColor)
                .setStrokeStyle(2, 0xffffff);

            // 在NPC下方添加名字
            this.add.text(x, y + npcHeight / 2 + 15, npcData.name, { font: '18px monospace', fill: '#ffffff' }).setOrigin(0.5);
            // 在NPC上方添加称号
            this.add.text(x, y - npcHeight / 2 - 15, `[${npcData.title}]`, { font: '16px monospace', fill: '#cccccc' }).setOrigin(0.5);

            // 使NPC可交互
            npcObject.setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    console.log(`与 ${npcData.name} 开始对话`);
                    this.dialogueSystem.startDialogue(npcData.id);
                });
        });
    }

    /**
     * update() 方法是游戏循环的核心，每一帧都会被调用。
     * @param {number} time - 游戏总运行时间（毫秒）
     * @param {number} delta - 自上一帧以来的时间差（毫秒）
     */
    update(time, delta) {
        // 在这里处理玩家输入、角色移动、游戏逻辑更新等
    }
};
