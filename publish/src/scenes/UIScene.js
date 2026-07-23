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
        this.dayAdvancing = false;
    }

    create() {
        this.createStatusDisplay();
        this.createActionButtons();
        this.createLogText();
        Game.EventBus.on('affinity-changed', this.showAffinityChange, this);
        Game.EventBus.on('game-day-changed', this.syncDay, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.updateUI();
    }

    createStatusDisplay() {
        this.add.rectangle(18, 16, 238, 132, 0x0d1b17, 0.88)
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

    async handleNextDay() {
        if (this.dayAdvancing) return;
        this.dayAdvancing = true;
        const player = Game.player;
        try {
            const result = await window.GameAffinity.advanceDay();
            player.day = result.day;
            player.stamina = player.maxStamina;
            player.dailyCultivationCount = player.maxDailyCultivation;
            window.GameAudio.sfx('success');
            this.showLog(`第 ${player.day} 天，交谈与赠礼次数已恢复`);
            this.updateUI();
        } catch (error) {
            console.error('推进日期失败:', error.code || '', error.message, error.stack);
            this.rejectAction('日期推进失败，请稍后重试');
        } finally {
            this.dayAdvancing = false;
        }
    }

    rejectAction(message) {
        window.GameAudio.sfx('deny');
        this.showLog(message);
    }

    showAffinityChange(data) {
        window.GameAudio.sfx('success');
        const action = data.source === 'gift' ? '赠礼' : '交谈';
        this.showLog(`${action}有所收获，好感 +${data.delta}`);
    }

    syncDay(data) {
        if (!Game.player || !data?.day) return;
        Game.player.day = data.day;
        this.updateUI();
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
        Game.EventBus.off('affinity-changed', this.showAffinityChange, this);
        Game.EventBus.off('game-day-changed', this.syncDay, this);
    }
};
