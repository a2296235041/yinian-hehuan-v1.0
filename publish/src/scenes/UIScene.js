var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.UIScene = class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
        this.dayText = null;
        this.staminaText = null;
        this.realmText = null;
        this.cultivationText = null;
        this.cultivationCountText = null;
        this.logText = null;
        this.dayAdvancing = false;
        this.cultivating = false;
        this.overlayOpening = false;
    }
    create() {
        this.createStatusDisplay();
        this.createActionButtons();
        this.createLogText();
        Game.EventBus.on('affinity-changed', this.showAffinityChange, this);
        Game.EventBus.on('game-day-changed', this.syncDay, this);
        Game.EventBus.on('player-state-changed', this.updateUI, this);
        Game.EventBus.on('cultivation-changed', this.updateUI, this);
        Game.EventBus.on('realm-breakthrough', this.showBreakthrough, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.updateUI();
        Game.SceneTransition.fadeIn(this);
    }
    createStatusDisplay() {
        this.add.rectangle(18, 16, 278, 160, 0x0d1b17, 0.88)
            .setOrigin(0, 0)
            .setStrokeStyle(1, 0xd8c38c, 0.65);
        const style = {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '17px',
            color: '#f4ead2'
        };
        this.dayText = this.add.text(32, 28, '', style);
        this.staminaText = this.add.text(32, 57, '', style);
        this.realmText = this.add.text(32, 84, '', style);
        this.cultivationText = this.add.text(32, 112, '', style);
        this.cultivationCountText = this.add.text(32, 140, '', style);
    }
    createActionButtons() {
        this.makeButton(920, 34, '储物袋', () => this.openOverlay('InventoryScene'));
        this.makeButton(995, 34, '出山', () => this.openOverlay('ExplorationScene'));
        this.makeButton(1070, 34, '修炼', () => this.handleCultivate());
        this.makeButton(1180, 34, '下一天', () => this.handleNextDay());
    }
    makeButton(x, y, label, action) {
        const button = this.add.text(x, y, label, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '18px',
            color: '#14231f',
            backgroundColor: '#f4ead2',
            padding: { x: 14, y: 9 }
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
            padding: { x: 20, y: 12 },
            align: 'center',
            wordWrap: { width: 820 }
        }).setOrigin(0.5).setAlpha(0);
    }
    async openOverlay(sceneKey) {
        if (this.overlayOpening || this.scene.isActive(sceneKey)) return;
        this.overlayOpening = true;
        try {
            await (Game.systemsReady || Promise.resolve());
            this.scene.launch(sceneKey);
        } finally {
            this.overlayOpening = false;
        }
    }
    async handleCultivate() {
        if (this.cultivating) return;
        const player = Game.player;
        if (player.stamina <= 0) return this.rejectAction('精力不足，无法修炼');
        if (player.dailyCultivationCount <= 0) return this.rejectAction('今日修炼次数已用尽');
        const cultivation = window.GameCultivation.getSnapshot();
        if (cultivation.maxRealm) {
            return this.rejectAction('已达到当前修炼体系的最高境界');
        }
        if (cultivation.canBreakthrough) {
            return this.rejectAction('修为已达圆满，请找一位 NPC 双修突破');
        }
        this.cultivating = true;
        player.stamina -= 1;
        player.dailyCultivationCount -= 1;
        const gain = 6 + cultivation.realmIndex * 4 + Math.floor(Math.random() * 6);
        try {
            const result = await window.GameCultivation.addCultivation(gain, 'cultivate');
            window.GameAudio.sfx('score');
            const fallback = result.snapshot.canBreakthrough
                ? `修为 +${result.gain}，已达${result.snapshot.realmName}圆满`
                : `静心吐纳，修为 +${result.gain}`;
            this.showLog('灵气正在汇聚，AI 正在补全修炼片段…');
            const stats = window.GamePlayerStats.getSnapshot();
            this.showLog(await window.GameNarrative.generateDetailed('cultivation', {
                identity: stats.originName,
                realm: result.snapshot.label,
                cultivationGain: result.gain,
                progress: `${result.snapshot.progress}/${result.snapshot.required}`
            }, fallback));
            this.updateUI();
        } finally {
            this.cultivating = false;
        }
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
            const fallback = `第 ${player.day} 天，交谈与赠礼次数已恢复`;
            this.showLog('晨光初现，AI 正在续写新一天…');
            this.showLog(await window.GameNarrative.generateDetailed('new_day', {
                day: player.day,
                identity: player.origin?.name,
                realm: window.GameCultivation.getSnapshot().label,
                stamina: `${player.stamina}/${player.maxStamina}`
            }, fallback));
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
        const actions = { gift: '赠礼', exploration: '偶遇', dialogue: '交谈' };
        const action = actions[data.source] || '相处';
        this.showLog(`${action}有所收获，好感 +${data.delta}`);
    }
    showBreakthrough(data) {
        this.showLog(`双修圆满，突破至${data.realmName}！`);
        this.updateUI();
    }
    syncDay(data) {
        if (!Game.player || !data?.day) return;
        Game.player.day = data.day;
        this.updateUI();
    }
    updateUI() {
        const player = Game.player;
        const cultivation = window.GameCultivation.getSnapshot();
        this.dayText.setText(`第 ${player.day} 天`);
        this.staminaText.setText(`精力　${player.stamina} / ${player.maxStamina}`);
        this.realmText.setText(`境界　${cultivation.label}`);
        this.cultivationText.setText(
            cultivation.maxRealm
                ? '修为　已臻化境'
                : `修为　${cultivation.progress} / ${cultivation.required}（${cultivation.percent}%）`
        );
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
        Game.EventBus.off('player-state-changed', this.updateUI, this);
        Game.EventBus.off('cultivation-changed', this.updateUI, this);
        Game.EventBus.off('realm-breakthrough', this.showBreakthrough, this);
    }
};
