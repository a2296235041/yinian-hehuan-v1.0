var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};
Game.Scenes.ExplorationScene = class ExplorationScene extends Phaser.Scene {
    constructor() {
        super('ExplorationScene');
        this.view = null; this.commandPanel = null; this.commandInput = null;
        this.commandSubmit = null; this.commandQuick = null; this.currentRegion = null;
        this.mode = 'overview'; this.busy = false; this.requestId = 0;
        this.baseScenesRestored = false; this.assetsReady = false; this.commandHandlers = null;
    }
    create() {
        this.baseScenesRestored = false;
        this.scene.pause('GameScene'); this.scene.pause('UIScene');
        this.scene.setVisible(false, 'GameScene'); this.scene.setVisible(false, 'UIScene');
        window.GameModelUI.setMode('hidden');
        this.view = Game.ExplorationView.create(this, () => this.close());
        this.bindCommandPanel();
        Game.EventBus.on('exploration-result', this.handleBattleResult, this);
        Game.EventBus.on('cultivation-changed', this.refreshView, this); Game.EventBus.on(
            'player-state-changed', this.refreshView, this
        );
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.refreshView();
        this.showOverview();
        this.loadEnemyAssets();
        Game.SceneTransition.fadeIn(this);
    }
    bindCommandPanel() {
        this.commandPanel = document.getElementById('exploration-command-panel');
        this.commandInput = document.getElementById('exploration-input');
        this.commandSubmit = document.getElementById('exploration-submit');
        this.commandQuick = document.getElementById('exploration-quick');
        const back = document.getElementById('exploration-back');
        const onSubmit = (event) => {
            event.preventDefault();
            this.exploreCurrent(this.commandInput?.value.trim() || '');
        };
        const onQuick = () => this.exploreCurrent('');
        const onBack = () => this.showOverview();
        this.commandHandlers = { back, onBack, onQuick, onSubmit };
        this.commandPanel?.addEventListener('submit', onSubmit);
        this.commandQuick?.addEventListener('click', onQuick);
        back?.addEventListener('click', onBack);
    }
    setCommandVisible(visible, disabled = false) {
        if (!this.commandPanel) return;
        this.commandPanel.hidden = !visible;
        [this.commandInput, this.commandSubmit, this.commandQuick].forEach((item) => {
            if (item) item.disabled = disabled;
        });
        if (visible && !disabled) this.commandInput?.focus();
    }
    loadEnemyAssets() {
        Game.EnemyAssets.ensureLoaded(this).then(() => {
            this.assetsReady = true;
            if (!this.currentRegion) Game.ExplorationView.setStatus(this.view, '', false);
        }).catch((error) => {
            if (error.code === 'LOAD_CANCELLED') return;
            console.error('敌人素材加载失败:', error.message, error.stack);
            Game.ExplorationView.setStatus(this.view, '敌人图鉴加载失败，请返回后重试。');
        });
    }
    refreshView() {
        if (!this.view) return;
        Game.ExplorationView.updatePlayerInfo(this.view);
        if (this.mode === 'overview' && !this.busy) {
            this.renderOverview();
        }
    }
    renderOverview() {
        Game.ExplorationView.setBackground(this, this.view, 'bg-sect-map');
        Game.ExplorationView.showRegions(
            this,
            this.view,
            window.GameExploration.getRegions(),
            (region) => this.enterRegion(region)
        );
        this.setCommandVisible(false);
    }
    showOverview() {
        if (this.busy) return;
        this.mode = 'overview';
        this.currentRegion = null;
        this.renderOverview();
    }
    enterRegion(region) {
        if (this.busy) return;
        this.currentRegion = region;
        this.mode = 'detail';
        Game.ExplorationView.showDetail(this, this.view, region, () => this.showOverview());
        Game.ExplorationView.setBackground(this, this.view, 'bg-sect-map');
        Game.ExplorationView.setStatus(this.view, `正在进入${region.name}…`);
        this.setCommandVisible(false, true);
        Game.ExplorationAssets.ensureLoaded(this, region.id).then(() => {
            if (this.currentRegion?.id !== region.id || !this.sys.isActive()) return;
            Game.ExplorationView.setBackground(
                this,
                this.view,
                Game.ExplorationAssets.key(region.id)
            );
            Game.ExplorationView.setStatus(this.view, '', false);
            this.setCommandVisible(true);
        }).catch((error) => {
            console.error('探险场景加载失败:', error.message, error.stack);
            Game.ExplorationView.setStatus(this.view, '场景加载失败，请返回区域后重试。');
            this.setCommandVisible(true);
        });
    }
    async exploreCurrent(intent) {
        const region = this.currentRegion;
        if (!region || this.busy) return;
        if (!this.assetsReady) {
            Game.ExplorationView.setStatus(this.view, '敌人图鉴正在加载，请稍候…');
            return;
        }
        this.busy = true;
        const requestId = ++this.requestId;
        let transitioning = false;
        this.setCommandVisible(true, true);
        Game.ExplorationView.setStatus(this.view, `正在${region.name}中探索…`);
        try {
            const result = await window.GameExploration.explore(region.id, intent);
            if (requestId !== this.requestId) return;
            this.refreshView();
            Game.ExplorationView.setStatus(
                this.view,
                `${result.text || '探索结束。'}\nAI 正在补全遭遇…`
            );
            result.text = await Game.ExplorationNarrator.generate(
                region,
                result,
                (draft) => {
                    if (requestId === this.requestId && this.view?.status?.active) {
                        Game.ExplorationView.setStatus(this.view, draft);
                    }
                }
            );
            if (requestId !== this.requestId) return;
            Game.ExplorationView.setStatus(this.view, result.text);
            if (result.type === 'battle') {
                transitioning = true;
                this.setCommandVisible(false, true);
                window.GameAudio.sfx('deny');
                Game.SceneTransition.fadeOut(this, () => {
                    this.scene.launch('BattleScene', { encounter: result });
                    this.scene.sleep();
                });
                return;
            }
            window.GameAudio.sfx(['error', 'locked', 'stamina'].includes(result.type)
                ? 'deny' : 'success');
        } catch (error) {
            console.error('探险结算失败:', error.message, error.stack);
            Game.ExplorationView.setStatus(this.view, '这次探索未能完成，请稍后重试。');
        } finally {
            this.busy = false;
            if (!transitioning && this.mode === 'detail' && this.currentRegion?.id === region.id) {
                this.setCommandVisible(true);
            }
        }
    }
    handleBattleResult(result) {
        Game.ExplorationView.setStatus(this.view, result?.text || '战斗结束。');
        this.refreshView();
        if (this.sys.isActive()) this.setCommandVisible(this.mode === 'detail');
    }
    close() {
        if (this.busy) return;
        this.requestId += 1;
        window.GameAudio.sfx('click');
        this.setCommandVisible(false);
        Game.SceneTransition.fadeOut(this, () => {
            this.restoreBaseScenes();
            this.scene.stop();
        });
    }
    restoreBaseScenes() {
        if (this.baseScenesRestored) return;
        this.baseScenesRestored = true;
        this.scene.setVisible(true, 'GameScene'); this.scene.setVisible(true, 'UIScene');
        this.scene.resume('GameScene'); this.scene.resume('UIScene');
        Game.SceneTransition.fadeIn(this.scene.get('GameScene'));
        Game.SceneTransition.fadeIn(this.scene.get('UIScene'));
        window.GameModelUI.setMode('compact');
    }
    cleanup() {
        this.requestId += 1;
        window.GameNarrative.cancel();
        this.setCommandVisible(false);
        const { back, onBack, onQuick, onSubmit } = this.commandHandlers || {};
        this.commandPanel?.removeEventListener('submit', onSubmit);
        this.commandQuick?.removeEventListener('click', onQuick);
        back?.removeEventListener('click', onBack);
        this.commandHandlers = null;
        Game.EventBus.off('exploration-result', this.handleBattleResult, this); Game.EventBus.off(
            'cultivation-changed', this.refreshView, this
        ); Game.EventBus.off('player-state-changed', this.refreshView, this);
        this.restoreBaseScenes();
    }
};
