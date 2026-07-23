var Game = window.Game || {};
Game.Systems = Game.Systems || {};

// CombatSystem 只处理数值，不创建任何 Phaser 对象。
// 因此未来可以复用到自动战斗、Boss 战或战斗回放中。
Game.Systems.CombatSystem = class CombatSystem {
    constructor(realmIndex, enemy) {
        this.enemy = { ...enemy };
        this.playerMaxHp = 110 + realmIndex * 90;
        this.playerHp = this.playerMaxHp;
        this.playerAttack = 18 + realmIndex * 20;
        this.enemyMaxHp = Math.max(1, Number(enemy.hp) || 1);
        this.enemyHp = this.enemyMaxHp;
        this.enemyAttack = Math.max(1, Number(enemy.attack) || 1);
        this.over = false;
    }

    random(min, max) {
        return Math.floor(min + Math.random() * (max - min + 1));
    }

    snapshot(log = '') {
        return {
            playerHp: Math.max(0, this.playerHp),
            playerMaxHp: this.playerMaxHp,
            enemyHp: Math.max(0, this.enemyHp),
            enemyMaxHp: this.enemyMaxHp,
            enemyName: this.enemy.name,
            over: this.over,
            won: this.enemyHp <= 0,
            lost: this.playerHp <= 0,
            log
        };
    }

    enemyTurn(reduction = 0) {
        if (this.enemyHp <= 0) return 0;
        const raw = this.random(Math.floor(this.enemyAttack * 0.8), Math.ceil(this.enemyAttack * 1.15));
        const damage = Math.max(1, Math.floor(raw * (1 - reduction)));
        this.playerHp = Math.max(0, this.playerHp - damage);
        if (this.playerHp <= 0) this.over = true;
        return damage;
    }

    act(type) {
        if (this.over) return this.snapshot('战斗已经结束。');
        if (type === 'defend') {
            const damage = this.enemyTurn(0.65);
            return this.snapshot(`你凝神防御，将来袭伤害压低至 ${damage} 点。`);
        }
        const damage = this.random(
            Math.floor(this.playerAttack * 0.8),
            Math.ceil(this.playerAttack * 1.2)
        );
        this.enemyHp = Math.max(0, this.enemyHp - damage);
        if (this.enemyHp <= 0) {
            this.over = true;
            return this.snapshot(`你造成 ${damage} 点伤害，击败了${this.enemy.name}。`);
        }
        const retaliation = this.enemyTurn(0);
        return this.snapshot(`你造成 ${damage} 点伤害，随后承受 ${retaliation} 点反击。`);
    }

    tryEscape() {
        if (this.over) return this.snapshot('战斗已经结束。');
        if (Math.random() < 0.45) {
            this.over = true;
            return { ...this.snapshot('你抓住空隙脱离了战场。'), escaped: true };
        }
        const damage = this.enemyTurn(0);
        return { ...this.snapshot(`撤退失败，你承受了 ${damage} 点追击伤害。`), escaped: false };
    }
};

Game.CombatSystem = Game.Systems.CombatSystem;
