/**
 * @file UIScene.js
 * @description UI场景，负责渲染所有用户界面元素和处理UI交互。
 */

var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.UIScene = class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
        
        this.dayText = null;
        this.staminaText = null;
        this.cultivationText = null;
        this.cultivationCountText = null;
        this.logText = null;
        
        this.dialogueBox = null;
        this.playerOptionsGroup = null; // 用于管理玩家选项的组
    }

    create() {
        console.log('UIScene: create');

        this.createStatusDisplay();
        this.createActionButtons();
        this.createLogText();
        this.createDialogueBox();

        // 监听全局事件
        Game.EventBus.on('update-dialogue-ui', this.showDialogue, this);
        Game.EventBus.on('hide-dialogue-ui', () => this.dialogueBox.setVisible(false), this);
        Game.EventBus.on('affinity-changed', this.showAffinityChange, this);

        this.updateUI();
    }

    // --- 创建UI元素 ---

    createStatusDisplay() {
        const style = { font: '18px monospace', fill: '#ffffff', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 5, y: 2 } };
        this.dayText = this.add.text(15, 15, '', style);
        this.staminaText = this.add.text(15, 45, '', style);
        this.cultivationText = this.add.text(15, 75, '', style);
        this.cultivationCountText = this.add.text(15, 105, '', style);
    }

    createActionButtons() {
        const style = { font: '24px monospace', fill: '#00ff00', backgroundColor: '#333333', padding: { x: 15, y: 10 } };
        this.add.text(this.cameras.main.width - 15, this.cameras.main.height - 65, '修炼', style)
            .setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.handleCultivate());
        this.add.text(this.cameras.main.width - 15, this.cameras.main.height - 125, '下一天', style)
            .setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.handleNextDay());
    }

    createLogText() {
        this.logText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, '', { font: '22px monospace', fill: '#ff0000', backgroundColor: 'rgba(0,0,0,0.7)'})
            .setOrigin(0.5).setAlpha(0);
    }

    createDialogueBox() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        this.dialogueBox = this.add.container(width / 2, height - 150);
        
        const dialogueBg = this.add.graphics().fillStyle(0x000000, 0.8).fillRoundedRect(-width/2 + 50, -100, width - 100, 200, 10);
        const npcNameText = this.add.text(-width/2 + 70, -90, '', { font: '22px monospace', fill: '#ff8c00' });
        const dialogueText = this.add.text(-width/2 + 70, -55, '', { font: '20px monospace', fill: '#ffffff', wordWrap: { width: width - 140 } });
        
        // 玩家选项将作为一个独立的组进行管理，但其成员会被添加到dialogueBox容器中
        this.playerOptionsGroup = this.add.group();

        this.dialogueBox.add([dialogueBg, npcNameText, dialogueText]);
        this.dialogueBox.setVisible(false);
    }

    // --- 事件处理和逻辑 ---

    handleCultivate() {
        const player = Game.player;
        if (player.stamina <= 0) { this.showLog('精力不足，无法修炼！'); return; }
        if (player.dailyCultivationCount <= 0) { this.showLog('今日修炼次数已用尽！'); return; }
        player.stamina -= 1;
        player.dailyCultivationCount -= 1;
        const gain = 5 + Math.floor(Math.random() * 5);
        player.cultivation += gain;
        this.showLog(`修炼成功！修为 +${gain}`);
        this.updateUI();
    }

    handleNextDay() {
        const player = Game.player;
        player.day += 1;
        player.stamina = player.maxStamina;
        player.dailyCultivationCount = player.maxDailyCultivation;
        this.showLog(`进入了第 ${player.day} 天，精力已完全恢复。`);
        this.updateUI();
    }

    /**
     * 显示/更新对话框
     * @param {object} data - 对话数据 { npcName, npcText, playerOptions }
     */
    showDialogue(data) {
        // 清除旧的选项
        this.playerOptionsGroup.clear(true, true);

        // 更新NPC名字和文本
        this.dialogueBox.getAt(1).setText(data.npcName);
        this.dialogueBox.getAt(2).setText(data.npcText);

        // 创建新的玩家选项
        const optionStyle = { font: '18px monospace', fill: '#00ffff', padding: { top: 8 } };
        const optionHoverStyle = { fill: '#ffff00' };
        const startX = -this.cameras.main.width/2 + 80;
        let startY = 0; // 选项的起始Y坐标，相对于容器

        data.playerOptions.forEach((option, index) => {
            const optionText = this.add.text(startX, startY, `> ${option.text}`, optionStyle)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => optionText.setStyle(optionHoverStyle))
                .on('pointerout', () => optionText.setStyle(optionStyle))
                .on('pointerdown', () => {
                    const gameScene = this.scene.get('GameScene');
                    // 确保 dialogueSystem 存在
                    if (gameScene && gameScene.dialogueSystem) {
                        gameScene.dialogueSystem.chooseOption(index);
                    }
                });
            
            this.playerOptionsGroup.add(optionText);
            this.dialogueBox.add(optionText); // 直接将选项添加到容器中
            startY += optionText.height;
        });

        this.dialogueBox.setVisible(true);
    }
    
    showAffinityChange(npcId, newAffinity) {
        // 可以在这里添加一个短暂的UI效果来显示好感度变化
        console.log(`UI: 检测到 ${npcId} 的好感度变为 ${newAffinity}`);
        this.showLog(`好感度: ${newAffinity}`);
    }

    updateUI() {
        const player = Game.player;
        this.dayText.setText(`第 ${player.day} 天`);
        this.staminaText.setText(`精力: ${player.stamina} / ${player.maxStamina}`);
        this.cultivationText.setText(`修为: ${player.cultivation}`);
        this.cultivationCountText.setText(`修炼次数: ${player.dailyCultivationCount} / ${player.maxDailyCultivation}`);
    }

    showLog(message) {
        this.logText.setText(message);
        this.logText.setAlpha(1);
        this.tweens.add({ targets: this.logText, alpha: 0, delay: 1500, duration: 500, ease: 'Power2' });
    }
};
