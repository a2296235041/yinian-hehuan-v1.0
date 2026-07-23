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
    }

    create() {
        if (!this.encounter?.enemy || !this.encounter?.region) {
            console.error('战斗启动失败: 遭遇数据不完整');
            Game.EventBus.emit('exploration-result', { text: '遭遇数据异常，已返回探索界面。' });
            this.scene.wake('ExplorationScene');
            this.scene.stop();
            return;
        }
        const cultivation = window.GameCultivation.getSnapshot();
        this.combat = new Game.CombatSystem(cultivation.realmIndex, this.encounter.enemy);
        this.add.image(640, 360, 'bg-sect-map').setDisplaySize(1280, 720);
        this.add.rectangle(640, 360, 1280, 720, 0x06100d, 0.78).setInteractive();
        this.add.text(640, 46, `${this.encounter.region.name} · 遭遇战`, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '34px',
            color: '#f4ead2'
        }).setOrigin(0.5);
        this.createFighter(360, '你', 'npc-scholar', true);
        this.createFighter(920, this.encounter.enemy.name, this.encounter.enemy.image_key, false);
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
            this.makeButton(500, 640, '攻击', () => this.act('attack')),
            this.makeButton(640, 640, '防御', () => this.act('defend')),
            this.makeButton(780, 640, '撤退', () => this.escape())
        ];
        this.finishButton = this.makeButton(640, 640, '结束战斗', () => this.closeBattle())
            .setVisible(false);
        this.render(this.combat.snapshot());
    }

    createFighter(x, label, imageKey, playerSide) {
        this.add.text(x, 116, label, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '25px',
            color: playerSide ? '#d8c38c' : '#f0a5a5'
        }).setOrigin(0.5);
        const image = this.add.image(x, 310, imageKey);
        image.setScale(Math.min(190 / image.width, 300 / image.height));
        this.add.rectangle(x - 150, 478, 300, 18, 0x10201b).setOrigin(0, 0.5);
        const bar = this.add.rectangle(x - 150, 478, 300, 14,
            playerSide ? 0x6bb79e : 0xb96060).setOrigin(0, 0.5);
        const text = this.add.text(x, 501, '', {
            fontFamily: 'serif',
            fontSize: '16px',
            color: '#f4ead2'
        }).setOrigin(0.5);
        if (playerSide) {
            this.playerBar = bar;
            this.playerHpText = text;
        } else {
            this.enemyBar = bar;
            this.enemyHpText = text;
        }
    }

    makeButton(x, y, label, action) {
        const button = this.add.text(x, y, label, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '22px',
            color: '#14231f',
            backgroundColor: '#f4ead2',
            padding: { x: 24, y: 11 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        button.on('pointerdown', action);
        return button;
    }

    render(state) {
        this.playerBar.displayWidth = 300 * state.playerHp / state.playerMaxHp;
        this.enemyBar.displayWidth = 300 * state.enemyHp / state.enemyMaxHp;
        this.playerHpText.setText(`气血 ${state.playerHp} / ${state.playerMaxHp}`);
        this.enemyHpText.setText(`气血 ${state.enemyHp} / ${state.enemyMaxHp}`);
        if (state.log) this.logText.setText(state.log);
        if (state.lost) this.resolveEnd(false);
        if (state.won) this.resolveEnd(true);
    }

    act(type) {
        if (this.busy || this.combat.over) return;
        window.GameAudio.sfx(type === 'attack' ? 'score' : 'click');
        this.cameras.main.shake(90, 0.002);
        this.render(this.combat.act(type));
    }

    escape() {
        if (this.busy || this.combat.over) return;
        const result = this.combat.tryEscape();
        this.render(result);
        if (result.escaped) this.resolveEnd(false, true);
    }

    async resolveEnd(won, escaped = false) {
        if (this.busy) return;
        this.busy = true;
        this.actionButtons.forEach((button) => button.disableInteractive().setVisible(false));
        if (won) {
            window.GameAudio.sfx('success');
            const reward = await window.GameExploration.completeBattle(this.encounter);
            this.logText.setText(reward.text);
            Game.EventBus.emit('exploration-result', reward);
        } else {
            window.GameAudio.sfx(escaped ? 'click' : 'deny');
            const result = {
                text: escaped ? '你成功脱离战场，本次没有获得战利品。'
                    : '你负伤退回宗门，本次没有获得战利品。'
            };
            this.logText.setText(result.text);
            Game.EventBus.emit('exploration-result', result);
        }
        this.finishButton.setVisible(true).setInteractive({ useHandCursor: true });
    }

    closeBattle() {
        this.scene.wake('ExplorationScene');
        this.scene.stop();
    }
};
