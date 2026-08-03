var Game = window.Game || {};

Game.BattleNarrator = {
    context(scene, action, state, extra = {}) {
        const enemy = scene.encounter.enemy;
        return {
            action,
            region: scene.encounter.region.name,
            player: {
                identity: scene.playerStats.originName,
                gender: window.GamePlayerIdentity.get().gender,
                realm: scene.playerStats.realmLabel,
                hp: `${state.playerHp}/${state.playerMaxHp}`,
                attack: state.playerAttack,
                defense: state.playerDefense,
                speed: state.playerSpeed
            },
            enemy: {
                name: enemy.name,
                realm: `${window.GameCultivation.getRealmName(
                    enemy.realm_index
                )}·${enemy.realm_phase}`,
                hp: `${state.enemyHp}/${state.enemyMaxHp}`,
                attack: state.enemyAttack,
                defense: state.enemyDefense,
                speed: state.enemySpeed
            },
            result: state.log,
            ...extra
        };
    },

    generate(scene, kind, action, state, fallback, extra, onUpdate) {
        return window.GameNarrative.generate(
            kind,
            this.context(scene, action, state, extra),
            fallback,
            onUpdate
        );
    },

    async settle(scene, won, escaped, state, onUpdate) {
        let result;
        try {
            result = won
                ? await window.GameExploration.completeBattle(scene.encounter)
                : {
                    text: escaped ? '你成功脱离战场，本次没有获得战利品。'
                        : '你负伤退回宗门，本次没有获得战利品。'
                };
        } catch (error) {
            console.error('战斗奖励结算失败:', error.code || '', error.message, error.stack);
            result = { text: '战斗已经结束，但奖励暂时未能写入存档。' };
        }
        const action = won ? 'victory' : (escaped ? 'escape' : 'defeat');
        const fallback = `${state.log}${result.text}`;
        const story = await this.generate(
            scene,
            'battle_end',
            action,
            state,
            fallback,
            { settlement: result.text },
            onUpdate
        );
        result.text = window.GameNarrative.compose(story, result.text);
        return result;
    }
};
