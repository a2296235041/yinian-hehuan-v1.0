var Game = window.Game || {};

Game.ExplorationNarrator = {
    context(region, result) {
        const stats = window.GamePlayerStats.getSnapshot();
        const enemy = result.enemy;
        return {
            region: {
                name: region.name,
                danger: region.danger,
                description: region.description
            },
            player: {
                identity: stats.originName,
                realm: stats.realmLabel,
                stamina: `${Game.player.stamina}/${Game.player.maxStamina}`,
                strength: stats.strength,
                constitution: stats.constitution,
                agility: stats.agility,
                intelligence: stats.intelligence,
                wisdom: stats.wisdom,
                luck: stats.luck
            },
            encounter: {
                type: result.type,
                fixedResult: result.text,
                npc: result.npc ? {
                    name: result.npc.name,
                    personality: result.npc.personality
                } : null,
                enemy: enemy ? {
                    name: enemy.name,
                    realm: `${window.GameCultivation.getRealmName(
                        enemy.realm_index
                    )}·${enemy.realm_phase}`,
                    hp: enemy.hp,
                    attack: enemy.attack,
                    defense: enemy.defense,
                    speed: enemy.speed
                } : null,
                item: result.item?.name || null,
                quantity: result.quantity || 0,
                cultivationGain: result.cultivation || 0
            }
        };
    },

    async generate(region, result, onUpdate) {
        const fact = result.text || '探索结束。';
        const story = await window.GameNarrative.generate(
            'exploration',
            this.context(region, result),
            fact,
            onUpdate
        );
        return window.GameNarrative.compose(story, fact);
    }
};
