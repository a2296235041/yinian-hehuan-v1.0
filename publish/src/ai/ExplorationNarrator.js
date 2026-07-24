var Game = window.Game || {};

Game.ExplorationNarrator = {
    context(region, result) {
        const stats = window.GamePlayerStats.getSnapshot();
        const enemy = result.enemy;
        const affinity = result.npc
            ? window.GameAffinity.getSnapshot(result.npc.id)
            : null;
        return {
            region: {
                name: region.name,
                danger: region.danger,
                description: region.description
            },
            playerIntent: result.intent || '',
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
                    title: result.npc.title,
                    realm: result.npc.realm_label,
                    personality: result.npc.personality,
                    relationship: affinity.relationship,
                    affinity: affinity.affinity
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
                spiritStones: result.spiritStones || 0,
                cultivationGain: result.cultivation || 0
            }
        };
    },

    async generate(region, result, onUpdate) {
        const fact = result.text || '探索结束。';
        const npcEncounter = result.type === 'npc' && result.npc;
        const fallback = npcEncounter
            ? '没想到会在这里遇见你。山路难行，既然同路，便陪我走上一程吧。'
            : fact;
        const update = npcEncounter
            ? (draft) => onUpdate?.(`${result.npc.name}：${draft}`)
            : onUpdate;
        const story = await window.GameNarrative.generate(
            npcEncounter ? 'npc_encounter' : 'exploration',
            this.context(region, result),
            fallback,
            update
        );
        if (npcEncounter) return `${result.npc.name}：${story}\n${fact}`;
        return window.GameNarrative.compose(story, fact);
    }
};
