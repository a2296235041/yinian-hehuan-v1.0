var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};
Game.Scenes.ExplorationScene = class ExplorationScene extends Phaser.Scene {
    constructor() {
        super('ExplorationScene');
        this.view = null; this.currentRegion = null; this.session = null;
        this.mode = 'overview'; this.busy = false; this.requestId = 0;
        this.baseScenesRestored = false;
    }
    create() {
        this.baseScenesRestored = false;
        this.currentRegion = null; this.session = null;
        this.mode = 'overview'; this.busy = false;
        try {
            this.setBaseScenesEnabled(false);
            window.GameModelUI.setMode('hidden');
            this.view = Game.ExplorationView.create(this, () => this.close());
            Game.EventBus.on('exploration-result', this.handleBattleResult, this);
            Game.EventBus.on('cultivation-changed', this.refreshView, this);
            Game.EventBus.on('player-state-changed', this.refreshView, this);
            this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
            this.refreshView();
            this.showOverview();
            Game.SceneTransition.fadeIn(this);
        } catch (error) {
            console.error('出山场景创建失败:', error.message, error.stack);
            this.restoreBaseScenes(); this.scene.stop();
        }
    }
    refreshView() {
        if (!this.view) return;
        Game.ExplorationView.updatePlayerInfo(this.view);
        if (this.mode === 'overview' && !this.busy) this.renderOverview();
    }
    renderOverview() {
        Game.ExplorationView.setBackground(this, this.view, 'bg-sect-map');
        Game.ExplorationView.showRegions(this, this.view, window.GameExploration.getRegions(),
            (region) => this.enterRegion(region));
    }
    showOverview() {
        this.requestId += 1; this.busy = false;
        GameExplorationDialogue.cancel();
        GameExplorationPanel.close();
        this.mode = 'overview';
        this.currentRegion = null; this.session = null;
        this.renderOverview();
    }
    enterRegion(region) {
        if (this.busy) return;
        this.currentRegion = region; this.session = GameExplorationDialogue.create(region);
        this.mode = 'detail';
        Game.ExplorationView.showDetail(this, this.view, region, () => this.showOverview());
        Game.ExplorationView.setBackground(this, this.view, 'bg-sect-map');
        Game.ExplorationView.setStatus(this.view, '', false);
        GameExplorationPanel.open(region, this.session, {
            onSubmit: (text) => this.handleSubmit(text),
            onQuick: () => this.exploreCurrent(''),
            onBack: () => this.showOverview()
        });
        GameExplorationPanel.setBusy(true, `正在进入${region.name}…`);
        Promise.resolve()
            .then(() => Game.ExplorationAssets.ensureLoaded(this, region.id))
            .then(() => {
                if (this.currentRegion?.id !== region.id || !this.sys.isActive()) return;
                Game.ExplorationView.setBackground(this, this.view, Game.ExplorationAssets.key(region.id));
                GameExplorationPanel.setBusy(false, '山风已定，四周灵机清晰可察。');
            })
            .catch((error) => {
                if (this.currentRegion?.id !== region.id || !this.sys.isActive()) return;
                console.error('探险场景加载失败:', error.message, error.stack);
                GameExplorationPanel.setBusy(false, '背景加载失败，但仍可继续探索。');
            });
    }
    handleSubmit(text) {
        if (this.session?.result) this.continueConversation(text);
        else this.exploreCurrent(text);
    }
    async continueConversation(text) {
        if (!this.session || this.busy) return;
        const session = this.session;
        this.busy = true;
        const requestId = ++this.requestId;
        GameExplorationDialogue.add(session, 'user', text);
        GameExplorationPanel.render(session);
        GameExplorationPanel.setBusy(true, 'AI 正在回应，预计数秒…');
        try {
            const generated = await GameExplorationDialogue.reply(session, text, (draft) => {
                if (requestId === this.requestId) GameExplorationPanel.render(session, draft);
            });
            if (requestId !== this.requestId) return;
            GameExplorationPanel.render(session);
            GameExplorationPanel.setBusy(false, generated.failed
                ? 'AI 暂时不可用，已显示本地回应。' : '');
        } finally {
            if (requestId === this.requestId) this.busy = false;
        }
    }
    async exploreCurrent(intent) {
        const region = this.currentRegion;
        const session = this.session;
        if (!region || !session || this.busy) return;
        this.busy = true;
        const requestId = ++this.requestId;
        let transitioning = false;
        const action = intent || (session.result ? '继续向前探索。' : '观察四周并开始探索。');
        GameExplorationDialogue.add(session, 'user', action);
        GameExplorationPanel.render(session);
        GameExplorationPanel.setBusy(true, `正在${region.name}中探索…`);
        try {
            const result = await window.GameExploration.explore(region.id, intent);
            if (requestId !== this.requestId) return;
            this.refreshView();
            if (['error', 'locked', 'stamina'].includes(result.type)) {
                GameExplorationDialogue.add(session, 'assistant', result.text);
                GameExplorationPanel.render(session);
                GameExplorationPanel.setBusy(false, '');
                window.GameAudio.sfx('deny');
                return;
            }
            GameExplorationPanel.setBusy(true, 'AI 正在生成探索内容，预计数秒…');
            const generated = await GameExplorationDialogue.describe(session, result, (draft) => {
                if (requestId === this.requestId) GameExplorationPanel.render(session, draft);
            });
            if (requestId !== this.requestId) return;
            GameExplorationPanel.render(session);
            GameExplorationPanel.setMode(true);
            if (result.type === 'battle') {
                GameExplorationPanel.setBusy(true, '正在准备战斗画面…');
                try {
                    await Game.EnemyAssets.ensureKeyLoaded(this, result.enemy.image_key);
                } catch (error) {
                    if (error.code === 'LOAD_CANCELLED') return;
                    console.error('战斗素材加载失败:', error.message, error.stack);
                }
                if (requestId !== this.requestId) return;
                transitioning = true;
                GameExplorationPanel.hide();
                window.GameAudio.sfx('deny');
                Game.SceneTransition.fadeOut(this, () => {
                    this.scene.launch('BattleScene', { encounter: result });
                    this.scene.sleep();
                });
                return;
            }
            window.GameAudio.sfx('success');
            if (generated.failed) {
                GameExplorationPanel.setBusy(false, 'AI 暂时不可用，已显示固定探索结果。');
            } else GameExplorationPanel.setBusy(false, '');
        } catch (error) {
            console.error('探险结算失败:', error.code || '', error.message, error.stack);
            GameExplorationPanel.setBusy(false, '这次探索未能完成，请稍后重试。');
        } finally {
            if (requestId === this.requestId) this.busy = false;
            if (!transitioning && this.mode === 'detail') GameExplorationPanel.setBusy(false);
        }
    }
    handleBattleResult(result) {
        if (!this.session) return;
        GameExplorationDialogue.add(this.session, 'assistant', result?.text || '战斗结束。');
        GameExplorationPanel.render(this.session);
        this.refreshView();
    }
    restorePanel() {
        if (!this.session || this.mode !== 'detail') return;
        GameExplorationPanel.show();
        GameExplorationPanel.render(this.session);
        GameExplorationPanel.setMode(Boolean(this.session.result));
        GameExplorationPanel.setBusy(false, '');
    }
    close() {
        this.requestId += 1; this.busy = false;
        GameExplorationDialogue.cancel(); GameExplorationPanel.close();
        window.GameAudio.sfx('click');
        Game.SceneTransition.fadeOut(this, () => {
            this.restoreBaseScenes();
            this.scene.stop();
        });
    }
    restoreBaseScenes() {
        if (this.baseScenesRestored) return;
        this.baseScenesRestored = true;
        this.setBaseScenesEnabled(true);
        ['GameScene', 'UIScene'].forEach((key) => Game.SceneTransition.fadeIn(this.scene.get(key)));
        window.GameModelUI.setMode('compact');
    }
    setBaseScenesEnabled(enabled) {
        ['GameScene', 'UIScene'].forEach((key) => {
            this.scene.setVisible(enabled, key); const input = this.scene.get(key)?.input;
            if (input) input.enabled = enabled;
        });
    }
    cleanup() {
        this.requestId += 1; GameExplorationDialogue.cancel();
        GameExplorationPanel.close();
        Game.EventBus.off('exploration-result', this.handleBattleResult, this);
        Game.EventBus.off('cultivation-changed', this.refreshView, this);
        Game.EventBus.off('player-state-changed', this.refreshView, this);
        this.restoreBaseScenes();
    }
};
