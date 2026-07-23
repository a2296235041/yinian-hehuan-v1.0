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
        this.playerOptionsGroup = null;
    }

    create() {
        this.createStatusDisplay();
        this.createActionButtons();
        this.createLogText();
        this.createDialogueBox();

        Game.EventBus.on('update-dialogue-ui', this.showDialogue, this);
        Game.EventBus.on('hide-dialogue-ui', this.hideDialogue, this);
        Game.EventBus.on('affinity-changed', this.showAffinityChange, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.updateUI();
    }

    createStatusDisplay() {
        const panel = this.add.rectangle(18, 16, 238, 132, 0x0d1b17, 0.88)
            .setOrigin(0, 0)
            .setStrokeStyle(1, 0xd8c38c, 0.65);
        const style = {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '17px',
            color: '#f4ead2'
        };
        this.dayText = this.add.text(32, 28, '', style);
        this.staminaText = this.add.text(32, 57, '', style);
        this.cultivationText = this.add.text(32, 86, '', style);
        this.cultivationCountText = this.add.text(32, 115, '', style);
        panel.setDepth(-1);
    }

    createActionButtons() {
        this.makeButton(1265, 92, '修炼', () => this.handleCultivate());
        this.makeButton(1265, 150, '下一天', () => this.handleNextDay());
    }

    makeButton(x, y, label, action) {
        const button = this.add.text(x, y, label, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '22px',
            color: '#14231f',
            backgroundColor: '#f4ead2',
            padding: { x: 18, y: 11 }
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => {
            window.GameAudio.sfx('click');
            this.tweens.add({ targets: button, scale: 0.95, duration: 70, yoyo: true });
            action();
        });
        return button;
    }

    createLogText() {
        this.logText = this.add.text(640, 328, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '23px',
            color: '#f4ead2',
            backgroundColor: 'rgba(13,27,23,0.92)',
            padding: { x: 20, y: 12 }
        }).setOrigin(0.5).setAlpha(0);
    }

    createDialogueBox() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.dialogueBox = this.add.container(width / 2, height - 126);
        const background = this.add.graphics()
            .fillStyle(0x09100e, 0.96)
            .fillRoundedRect(-width / 2 + 38, -108, width - 76, 220, 6)
            .lineStyle(2, 0xd8c38c, 0.75)
            .strokeRoundedRect(-width / 2 + 38, -108, width - 76, 220, 6);
        const name = this.add.text(-width / 2 + 62, -92, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '21px',
            color: '#d8c38c'
        });
        const dialogue = this.add.text(-width / 2 + 62, -56, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '18px',
            color: '#f4ead2',
            wordWrap: { width: width - 150 }
        });
        const close = this.add.text(width / 2 - 64, -92, '×', {
            fontFamily: 'sans-serif',
            fontSize: '30px',
            color: '#f4ead2',
            padding: { x: 10, y: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on('pointerdown', () => {
            const gameScene = this.scene.get('GameScene');
            gameScene?.dialogueSystem?.endDialogue();
        });

        this.playerOptionsGroup = this.add.group();
        this.dialogueBox.add([background, name, dialogue, close]);
        this.dialogueBox.setVisible(false);
    }

    handleCultivate() {
        const player = Game.player;
        if (player.stamina <= 0) return this.rejectAction('精力不足，无法修炼');
        if (player.dailyCultivationCount <= 0) return this.rejectAction('今日修炼次数已用尽');
        player.stamina -= 1;
        player.dailyCultivationCount -= 1;
        const gain = 5 + Math.floor(Math.random() * 5);
        player.cultivation += gain;
        window.GameAudio.sfx('score');
        this.showLog(`静心吐纳，修为 +${gain}`);
        this.updateUI();
    }

    handleNextDay() {
        const player = Game.player;
        player.day += 1;
        player.stamina = player.maxStamina;
        player.dailyCultivationCount = player.maxDailyCultivation;
        window.GameAudio.sfx('success');
        this.showLog(`第 ${player.day} 天，精力已恢复`);
        this.updateUI();
    }

    rejectAction(message) {
        window.GameAudio.sfx('deny');
        this.showLog(message);
    }

    showDialogue(data) {
        this.playerOptionsGroup.clear(true, true);
        this.dialogueBox.getAt(1).setText(data.npcName);
        this.dialogueBox.getAt(2).setText(data.npcText);
        let y = 4;
        data.playerOptions.forEach((option, index) => {
            const text = this.add.text(-560, y, `> ${option.text}`, {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '17px',
                color: '#cde9df',
                padding: { y: 5 }
            }).setInteractive({ useHandCursor: true });
            text.on('pointerdown', () => {
                window.GameAudio.sfx('click');
                this.scene.get('GameScene')?.dialogueSystem?.chooseOption(index);
            });
            this.playerOptionsGroup.add(text);
            this.dialogueBox.add(text);
            y += 31;
        });
        this.dialogueBox.setVisible(true);
    }

    hideDialogue() {
        this.playerOptionsGroup.clear(true, true);
        this.dialogueBox.setVisible(false);
    }

    showAffinityChange(npcId, affinity) {
        window.GameAudio.sfx(affinity >= 0 ? 'success' : 'deny');
        this.showLog(`好感度变为 ${affinity}`);
    }

    updateUI() {
        const player = Game.player;
        this.dayText.setText(`第 ${player.day} 天`);
        this.staminaText.setText(`精力　${player.stamina} / ${player.maxStamina}`);
        this.cultivationText.setText(`修为　${player.cultivation}`);
        this.cultivationCountText.setText(
            `修炼　${player.dailyCultivationCount} / ${player.maxDailyCultivation}`
        );
    }

    showLog(message) {
        this.logText.setText(message).setAlpha(1);
        this.tweens.killTweensOf(this.logText);
        this.tweens.add({
            targets: this.logText,
            alpha: 0,
            delay: 1300,
            duration: 450,
            ease: 'Power2'
        });
    }

    cleanup() {
        Game.EventBus.off('update-dialogue-ui', this.showDialogue, this);
        Game.EventBus.off('hide-dialogue-ui', this.hideDialogue, this);
        Game.EventBus.off('affinity-changed', this.showAffinityChange, this);
    }
};
