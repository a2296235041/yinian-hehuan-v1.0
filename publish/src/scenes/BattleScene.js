var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.BattleScene = class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
        this.encounter = null;
        this.combat = null;
        this.playerHpText = null;
        this.enemyHpText = null;
        this.playerBar = null;
        this.enemyBar = null;
        this.logText = null;
        this.actionButtons = [];
        this.finishButton = null;
        this.busy = false;
        this.ending = false;
        this.requestId = 0;
        this.playerStats = null;
    }
    init(data = {}) {
        // Phaser 停止场景后会复用同一个实例，因此每场战斗都必须重置临时状态。
        this.encounter = data.encounter || null;
        this.combat = null;
        this.playerHpText = null;
        this.enemyHpText = null;
        this.playerBar = null;
        this.enemyBar = null;
        this.logText = null;
        this.actionButtons = [];
        this.finishButton = null;
        this.busy = false;
        this.ending = false;
        this.requestId += 1;
        this.playerStats = null;
    }
    create() {
        if (!this.encounter?.enemy || !this.encounter?.region) {
            console.error('战斗启动失败: 遭遇数据不完整');
            Game.EventBus.emit('exploration-result', { text: '遭遇数据异常，已返回探索界面。' });
            this.scene.wake('ExplorationScene');
            Game.SceneTransition.fadeIn(this.scene.get('ExplorationScene'));
            this.scene.stop();
            return;
        }
        const cultivation = window.GameCultivation.getSnapshot();
        this.playerStats = window.GamePlayerStats.getSnapshot();
        this.combat = new Game.CombatSystem(this.playerStats, this.encounter.enemy);
        this.add.image(640, 360, 'bg-sect-map').setDisplaySize(1280, 720);
        this.add.rectangle(640, 360, 1280, 720, 0x06100d, 0.78).setInteractive();
        this.add.text(640, 46, `${this.encounter.region.name} · 遭遇战`, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '34px',
            color: '#f4ead2'
        }).setOrigin(0.5);
        const enemyRealm = `${window.GameCultivation.getRealmName(
            this.encounter.enemy.realm_index
        )}·${this.encounter.enemy.realm_phase}`;
        const playerView = Game.BattleUI.createFighter(
            this, 360, '你', 'npc-scholar', true,
            `${cultivation.label}\n攻击 ${this.playerStats.attack}　防御 ${this.playerStats.defense}` +
            `　速度 ${this.playerStats.speed}`
        );
        const enemyView = Game.BattleUI.createFighter(
            this, 920, this.encounter.enemy.name, this.encounter.enemy.image_key, false,
            `${enemyRealm}\n攻击 ${this.encounter.enemy.attack}　防御 ${this.encounter.enemy.defense}` +
            `　速度 ${this.encounter.enemy.speed}`
        );
        this.playerBar = playerView.bar;
        this.playerHpText = playerView.text;
        this.enemyBar = enemyView.bar;
        this.enemyHpText = enemyView.text;
        this.logText = this.add.text(640, 535, this.encounter.text, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '20px',
            color: '#f4ead2',
            backgroundColor: 'rgba(13,27,23,0.94)',
            padding: { x: 20, y: 12 },
            align: 'center',
            wordWrap: { width: 800 }
        }).setOrigin(0.5);
        this.actionButtons = [
            Game.BattleUI.makeButton(this, 500, 640, '攻击', () => this.act('attack')),
            Game.BattleUI.makeButton(this, 640, 640, '防御', () => this.act('defend')),
            Game.BattleUI.makeButton(this, 780, 640, '撤退', () => this.escape())
        ];
        this.finishButton = Game.BattleUI.makeButton(
            this, 640, 640, '结束战斗', () => this.closeBattle()
        ).setVisible(false);
        this.render(this.combat.snapshot());
        Game.SceneTransition.fadeIn(this);
    }
    setActionsEnabled(enabled) {
        this.actionButtons.forEach((button) => {
            if (enabled) button.setInteractive({ useHandCursor: true });
            else button.disableInteractive();
        });
    }
    render(state) {
        this.playerBar.displayWidth = 300 * state.playerHp / state.playerMaxHp;
        this.enemyBar.displayWidth = 300 * state.enemyHp / state.enemyMaxHp;
        this.playerHpText.setText(`气血 ${state.playerHp} / ${state.playerMaxHp}`);
        this.enemyHpText.setText(`气血 ${state.enemyHp} / ${state.enemyMaxHp}`);
        if (state.log) this.logText.setText(state.log);
    }
    async act(type) {
        if (this.busy || this.combat.over) return;
        this.busy = true;
        this.setActionsEnabled(false);
        window.GameAudio.sfx(type === 'attack' ? 'score' : 'click');
        this.cameras.main.shake(90, 0.002);
        const state = this.combat.act(type);
        this.render(state);
        if (state.over) return this.resolveEnd(state.won, false, state);
        const requestId = ++this.requestId;
        this.logText.setText(`${state.log}\n\nAI 正在补全这一幕…`);
        const text = await Game.BattleNarrator.generate(
            this,
            'battle_action',
            type,
            state,
            state.log,
            {},
            (draft) => {
                if (requestId === this.requestId && this.logText?.active) {
                    this.logText.setText(draft);
                }
            }
        );
        if (requestId !== this.requestId) return;
        this.logText.setText(window.GameNarrative.compose(text, state.log));
        this.busy = false;
        this.setActionsEnabled(true);
    }
    async escape() {
        if (this.busy || this.combat.over) return;
        this.busy = true;
        this.setActionsEnabled(false);
        const result = this.combat.tryEscape();
        this.render(result);
        if (result.escaped || result.lost) return this.resolveEnd(false, result.escaped, result);
        const requestId = ++this.requestId;
        const text = await Game.BattleNarrator.generate(
            this,
            'battle_action',
            'escape_failed',
            result,
            result.log,
            {},
            (draft) => {
                if (requestId === this.requestId && this.logText?.active) {
                    this.logText.setText(draft);
                }
            }
        );
        if (requestId !== this.requestId) return;
        this.logText.setText(window.GameNarrative.compose(text, result.log));
        this.busy = false;
        this.setActionsEnabled(true);
    }
    async resolveEnd(won, escaped, state) {
        if (this.ending) return;
        this.ending = true;
        this.busy = true;
        this.actionButtons.forEach((button) => button.disableInteractive().setVisible(false));
        window.GameAudio.sfx(won ? 'success' : (escaped ? 'click' : 'deny'));
        const requestId = ++this.requestId;
        const result = await Game.BattleNarrator.settle(
            this, won, escaped, state,
            (draft) => {
                if (requestId === this.requestId && this.logText?.active) {
                    this.logText.setText(draft);
                }
            }
        );
        if (requestId !== this.requestId) return;
        this.logText.setText(result.text);
        Game.EventBus.emit('exploration-result', result);
        this.finishButton.setVisible(true).setInteractive({ useHandCursor: true });
    }
    closeBattle() {
        this.requestId += 1;
        Game.SceneTransition.fadeOut(this, () => {
            this.scene.wake('ExplorationScene');
            Game.SceneTransition.fadeIn(this.scene.get('ExplorationScene'));
            this.scene.stop();
        });
    }
};
