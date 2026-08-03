var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.UIScene = class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
        this.dayText = null;
        this.nameText = null;
        this.realmText = null;
        this.statusPanel = null;
        this.detailPanel = null;
        this.detailText = null;
        this.avatarImage = null;
        this.avatarRing = null;
        this.avatarMaskShape = null;
        this.detailVisible = false;
        this.playerName = '无名修士';
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
        Game.EventBus.on('time-period-changed', this.updateUI, this);
        Game.EventBus.on('player-state-changed', this.updateUI, this);
        Game.EventBus.on('cultivation-changed', this.updateUI, this);
        Game.EventBus.on('realm-breakthrough', this.showBreakthrough, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.updateUI();
        this.loadPlayerProfile();
        Game.SceneTransition.fadeIn(this);
    }
    createStatusDisplay() {
        this.statusPanel = Game.UISkin.addPanel(this, 183, 58, 330, 88, 'wide', {
            depth: 20,
            alpha: 0.96
        });
        this.avatarRing = this.add.circle(62, 58, 30, 0x321522, 1)
            .setStrokeStyle(2, 0xf0a8bb, 0.95)
            .setDepth(21);
        this.avatarMaskShape = this.make.graphics({ x: 0, y: 0, add: false });
        this.avatarMaskShape.fillCircle(62, 58, 27);
        const avatarMask = this.avatarMaskShape.createGeometryMask();
        this.avatarImage = this.add.image(62, 58, 'npc-scholar')
            .setDisplaySize(62, 62)
            .setMask(avatarMask)
            .setDepth(22);
        this.fitAvatarImage();
        const avatarButton = this.add.circle(62, 58, 34, 0xffffff, 0.001)
            .setInteractive({ useHandCursor: true })
            .setDepth(23);
        avatarButton.on('pointerdown', () => this.toggleDetails());
        const style = {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#fff8fa'
        };
        this.nameText = this.add.text(106, 32, '', style).setDepth(21);
        this.dayText = this.add.text(106, 61, '', style).setDepth(21);
        this.realmText = this.add.text(216, 61, '', style).setDepth(21);
        this.detailPanel = Game.UISkin.addPanel(this, 198, 263, 360, 306, 'card', {
            depth: 20,
            alpha: 0.98
        })
            .setVisible(false);
        this.detailText = this.add.text(36, 130, '', {
            ...style,
            fontSize: '15px',
            lineSpacing: 7,
            wordWrap: { width: 324, useAdvancedWrap: true }
        }).setDepth(21).setVisible(false);
    }
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
    createLogText() {
        this.logText = this.add.text(640, 328, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '23px',
            color: '#fff8fa',
            backgroundColor: 'rgba(50,21,34,0.92)',
            padding: { x: 20, y: 12 },
            align: 'center',
            wordWrap: { width: 840, useAdvancedWrap: true },
            fixedWidth: 900,
            fixedHeight: 180
        }).setOrigin(0.5).setAlpha(0).setVisible(false)
            .setInteractive({ useHandCursor: true });
        this.logText.on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            this.tweens.killTweensOf(this.logText);
            this.logText.setAlpha(0).setVisible(false);
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
    updateUI() {
        const player = Game.player;
        const cultivation = window.GameCultivation.getSnapshot();
        this.dayText.setText(window.GameTime.getSnapshot(player).label);
        this.realmText.setText(cultivation.label);
        this.nameText.setText(this.playerName || player.origin?.name || '无名修士');
        this.updateDetails();
    }
    async loadPlayerProfile() {
        const profile = await window.PlatformBridge.getPlayerProfile();
        this.playerName = profile.name || Game.player?.origin?.name || '无名修士';
        this.updateUI();
        if (!profile.avatarUrl || !this.avatarImage?.active) return;
        const textureKey = 'player-avatar';
        if (this.textures.exists(textureKey)) {
            this.avatarImage.setTexture(textureKey);
            this.fitAvatarImage();
            return;
        }
        try {
            this.load.once('loaderror', (file) => {
                if (file.key === textureKey) {
                    console.warn('玩家头像加载失败，继续使用默认头像');
                }
            });
            this.load.once('complete', () => {
                if (this.avatarImage?.active && this.textures.exists(textureKey)) {
                    this.avatarImage.setTexture(textureKey);
                    this.fitAvatarImage();
                }
            });
            this.load.image(textureKey, profile.avatarUrl);
            this.load.start();
        } catch (error) {
            console.error('玩家头像加载失败:', error.code || '', error.message, error.stack);
        }
    }
    fitAvatarImage() {
        if (!this.avatarImage?.active) return;
        const targetSize = 62;
        const width = Number(this.avatarImage.width) || targetSize;
        const height = Number(this.avatarImage.height) || targetSize;
        const scale = Math.max(targetSize / width, targetSize / height);
        this.avatarImage.setScale(scale);
    }
    toggleDetails() {
        this.detailVisible = !this.detailVisible;
        this.detailPanel.setVisible(this.detailVisible);
        this.detailText.setVisible(this.detailVisible);
        this.updateDetails();
    }
    updateDetails() {
        if (!this.detailText || !Game.player) return;
        const cultivation = window.GameCultivation.getSnapshot();
        const stats = window.GamePlayerStats.getSnapshot();
        const player = Game.player;
        const cultivationLine = cultivation.maxRealm
            ? '修为　已臻化境'
            : `修为　${cultivation.progress} / ${cultivation.required}（${cultivation.percent}%）`;
        const lines = [
            `身份　${stats.originName}`,
            `天赋　${stats.talentName}`,
            `境界　${cultivation.label}`,
            cultivationLine,
            `精力　${player.stamina} / ${player.maxStamina}`,
            `今日修炼　${player.dailyCultivationCount} / ${player.maxDailyCultivation}`,
            '',
            '力量　' + stats.strength + '　　根骨　' + stats.constitution,
            '身法　' + stats.agility + '　　神识　' + stats.intelligence,
            '魅力　' + stats.charisma + '　　悟性　' + stats.wisdom,
            '气运　' + stats.luck,
            '',
            `战斗　攻击 ${stats.attack}　防御 ${stats.defense}　速度 ${stats.speed}`
        ];
        this.detailText.setText(lines.join('\n'));
    }
    showLog(message) {
        const text = Game.TextBoxUtils.fit(message, 36, 5);
        this.logText.setText(text).setAlpha(1).setVisible(true);
        this.logText.input?.hitArea?.setTo?.(0, 0, this.logText.width, this.logText.height);
        this.tweens.killTweensOf(this.logText);
        this.tweens.add({
            targets: this.logText,
            alpha: 0,
            delay: Math.min(7000, 2300 + text.length * 28),
            duration: 450,
            ease: 'Power2',
            onComplete: () => this.logText?.setVisible(false)
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
