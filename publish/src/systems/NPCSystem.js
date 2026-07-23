var Game = window.Game || {};
Game.Systems = Game.Systems || {};

Game.Systems.NPCSystem = class NPCSystem {
    constructor(scene) {
        this.scene = scene;
        this.npcs = new Map();
        this.readyPromise = Promise.resolve();
    }

    init() {
        const npcData = this.scene.cache.json.get('npcs');
        if (!npcData) {
            console.error('NPCSystem: 未能从缓存中加载NPC数据！');
            return;
        }
        npcData.forEach((npc) => this.npcs.set(npc.id, npc));
        this.readyPromise = window.GameAffinity.initialize(npcData);
        console.log('NPC系统已初始化，加载了', this.npcs.size, '个NPC。');
    }

    ready() {
        return this.readyPromise;
    }

    getNpcDataById(id) {
        return this.npcs.get(id) || null;
    }

    getNpcStateById(id) {
        return window.GameAffinity.getSnapshot(id);
    }

    getAllNpcs() {
        return this.npcs;
    }

    recordDialogue(id) {
        return window.GameAffinity.recordDialogue(id);
    }
};

Game.NPCSystem = Game.Systems.NPCSystem;
