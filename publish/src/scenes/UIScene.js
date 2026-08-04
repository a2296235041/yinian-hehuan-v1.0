var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.UIScene = class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
        this.playerStatus = null;
        this.logBox = null;
        this.dayAdvancing = false;
        this.cultivating = false;
        this.overlayOpening = false;
    }
    create() {
        this.createStatusDisplay();
        this.createActionButtons();
        this.createLogBox();
        Game.EventBus.on('affinity-changed', this.showAffinityChange, this);
        Game.EventBus.on('time-period-changed', this.updateUI, this);
        Game.EventBus.on('player-state-changed', this.updateUI, this);
        Game.EventBus.on('cultivation-changed', this.updateUI, this);
        Game.EventBus.on('realm-breakthrough', this.showBreakthrough, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.updateUI();
        this.loadPlayerProfile();
        Game.SceneTransition.fadeIn(this);
    }
    createStatusDisplay() { this.playerStatus = Game.PlayerStatusView.create(this); }
    createActionButtons() {
        const y = 680;
        this.makeButton(714, y, '下一天', () => this.handleNextDay());
        this.makeButton(830, y, '下一时段', () => this.handleNextPeriod());
        this.makeButton(946, y, '修炼', () => this.handleCultivate());
        this.makeButton(1062, y, '出山', () => this.openOverlay('ExplorationScene'));
        this.makeButton(1178, y, '储物袋', () => this.openOverlay('InventoryScene'));
    }
    makeButton(x, y, label, action) {
        return Game.UISkin.makeButton(this, x, y, label, () => {
            window.GameAudio.sfx('click');
            action();
        }, { width: 104, height: 46, fontSize: 16 });
    }
    createLogBox() {
        this.logBox = Game.TransitionMessageBox.create(this);
        this.logBox.hitTarget.on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            pointer?.event?.stopPropagation?.();
            this.dismissLogBox();
        });
    }
    dismissLogBox() {
        const target = this.logBox?.container;
        if (!target?.visible) return;
        window.GameAudio.sfx('click');
        this.tweens.killTweensOf(target);
        this.tweens.add({
            targets: target,
            alpha: 0,
            scaleX: 0.985,
            scaleY: 0.985,
            duration: 80,
            ease: 'Sine.easeIn',
            onComplete: () => target.setVisible(false).setScale(1)
        });
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
        const stats = window.GamePlayerStats.getSnapshot();
        const baseGain = 8 + cultivation.realmIndex * 8 + Math.floor(Math.random() * 5);
        const gain = Math.max(1, Math.floor(baseGain * (1 + stats.cultivationGainPercent / 100)));
        try {
            const result = await window.GameCultivation.addCultivation(gain, 'cultivate');
            window.GameAudio.sfx('score');
            const fallback = result.snapshot.canBreakthrough
                ? `修为 +${result.gain}，已达${result.snapshot.realmName}圆满`
                : `静心吐纳，修为 +${result.gain}`;
            this.showLog('灵气正在汇聚，AI 正在补全修炼片段…');
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
    async handleNextPeriod() {
        if (this.dayAdvancing) return;
        this.dayAdvancing = true;
        const player = Game.player;
        try {
            const result = await window.GameTime.advance();
            window.GameAudio.sfx('success');
            const fallback = result.newDay
                ? `第 ${player.day} 天清晨，交谈、赠礼、修炼与精力均已恢复`
                : `时段推进至${result.name}，${result.atmosphere}`;
            this.showLog(`${result.name}时已至，AI 正在续写宗门光景…`);
            this.showLog(await window.GameNarrative.generateDetailed('time_shift', {
                day: player.day,
                period: result.name,
                atmosphere: result.atmosphere,
                identity: player.origin?.name,
                realm: window.GameCultivation.getSnapshot().label,
                stamina: `${player.stamina}/${player.maxStamina}`
            }, fallback));
            this.updateUI();
        } catch (error) {
            console.error('推进时段失败:', error.code || '', error.message, error.stack);
            this.rejectAction('时段推进失败，请稍后重试');
        } finally {
            this.dayAdvancing = false;
        }
    }
    async handleNextDay() {
        if (this.dayAdvancing) return;
        this.dayAdvancing = true;
        const player = Game.player;
        try {
            const result = await window.GameTime.advanceDay();
            window.GameAudio.sfx('success');
            const fallback = `直接进入第 ${player.day} 天清晨，交谈、赠礼、修炼与精力均已恢复`;
            this.showLog('新的一天开始，AI 正在续写宗门晨景…');
            this.showLog(await window.GameNarrative.generateDetailed('new_day', {
                day: player.day,
                period: result.name,
                identity: player.origin?.name,
                realm: window.GameCultivation.getSnapshot().label,
                stamina: `${player.stamina}/${player.maxStamina}`
            }, fallback));
            this.updateUI();
        } catch (error) {
            console.error('推进下一天失败:', error.code || '', error.message, error.stack);
            this.rejectAction('推进下一天失败，请稍后重试');
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
    updateUI() { Game.PlayerStatusView.update(this.playerStatus); }
    async loadPlayerProfile() {
        await Game.PlayerStatusView.loadProfile(this, this.playerStatus);
    }
    showLog(message) {
        const text = this.logBox.layout(message);
        const target = this.logBox.container.setScale(1).setAlpha(1).setVisible(true);
        this.tweens.killTweensOf(target);
        this.tweens.add({
            targets: target,
            alpha: 0,
            delay: Math.min(7000, 2300 + text.length * 28),
            duration: 450,
            ease: 'Power2',
            onComplete: () => target.setVisible(false)
        });
    }
    cleanup() {
        Game.EventBus.off('affinity-changed', this.showAffinityChange, this);
        Game.EventBus.off('time-period-changed', this.updateUI, this);
        Game.EventBus.off('player-state-changed', this.updateUI, this);
        Game.EventBus.off('cultivation-changed', this.updateUI, this);
        Game.EventBus.off('realm-breakthrough', this.showBreakthrough, this);
    }
};
