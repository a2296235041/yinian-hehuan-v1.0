/**
 * @file CharacterCreationScene.js
 * @description 角色创建场景
 * 玩家在此选择他们的初始身份，并开始游戏。
 */

var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.CharacterCreationScene = class CharacterCreationScene extends Phaser.Scene {
    constructor() {
        super('CharacterCreationScene');
        this.originsData = null; // 用于存储从JSON加载的身份数据
        this.selectedOriginIndex = 0; // 当前选中的身份索引
        this.originInfoText = null; // 用于显示身份信息的文本对象
    }

    /**
     * init() 方法在场景启动时被调用，早于 preload 和 create。
     * 可以在这里接收从上一个场景传递过来的数据。
     */
    init() {
        // 从缓存中获取已加载的JSON数据
        this.originsData = this.cache.json.get('character_origins');
        console.log('CharacterCreationScene: init, 身份数据已加载', this.originsData);
    }

    create() {
        console.log('CharacterCreationScene: create');

        // 1. 添加背景和标题
        this.cameras.main.setBackgroundColor('#1c1c1c');
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.add.text(width / 2, 50, '选择你的命运', {
            font: '36px monospace',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // 2. 创建用于显示身份信息的文本区域
        this.originInfoText = this.add.text(width / 2, height / 2, '', {
            font: '20px monospace',
            fill: '#dddddd',
            align: 'left',
            wordWrap: { width: width - 100, useAdvancedWrap: true }
        }).setOrigin(0.5);

        // 3. 创建左右切换按钮
        const leftButton = this.add.text(50, height / 2, '<', { font: '48px monospace', fill: '#00ff00' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.selectPreviousOrigin());

        const rightButton = this.add.text(width - 50, height / 2, '>', { font: '48px monospace', fill: '#00ff00' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.selectNextOrigin());

        // 4. 创建确认按钮
        const confirmButton = this.add.text(width / 2, height - 80, '以此身份开始', {
            font: '28px monospace',
            fill: '#00ff00',
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.confirmSelection());

        // 5. 初始化显示第一个身份的信息
        this.displayOriginInfo();
    }

    /**
     * 更新显示的身份信息
     */
    displayOriginInfo() {
        const origin = this.originsData[this.selectedOriginIndex];
        let text = `【${origin.name}】\n\n`;
        text += `背景：${origin.description}\n\n`;
        text += `天赋 - ${origin.talent.name}：${origin.talent.description}\n\n`;
        text += `属性倾向：\n`;
        for (const attr in origin.attributes) {
            text += `  - ${this.getAttrName(attr)}: ${origin.attributes[attr]}\n`;
        }
        this.originInfoText.setText(text);
    }

    /**
     * 选择上一个身份
     */
    selectPreviousOrigin() {
        this.selectedOriginIndex--;
        if (this.selectedOriginIndex < 0) {
            this.selectedOriginIndex = this.originsData.length - 1;
        }
        this.displayOriginInfo();
    }

    /**
     * 选择下一个身份
     */
    selectNextOrigin() {
        this.selectedOriginIndex++;
        if (this.selectedOriginIndex >= this.originsData.length) {
            this.selectedOriginIndex = 0;
        }
        this.displayOriginInfo();
    }

    /**
     * 确认选择，开始游戏
     */
    confirmSelection() {
        const selectedOrigin = this.originsData[this.selectedOriginIndex];
        console.log(`玩家选择了身份: ${selectedOrigin.name}`);
        
        // 启动核心游戏场景，并将玩家选择的身份数据作为参数传递过去
        this.scene.start('GameScene', { playerOrigin: selectedOrigin });
    }

    /**
     * 辅助函数，将属性ID转换为中文名
     */
    getAttrName(attrId) {
        const names = {
            strength: '力量',
            constitution: '根骨',
            agility: '身法',
            intelligence: '神识',
            charisma: '魅力',
            wisdom: '悟性',
            luck: '气运'
        };
        return names[attrId] || attrId;
    }
};
