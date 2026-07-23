/**
 * @file NPCSystem.js
 * @description NPC管理系统
 * 负责加载、存储和查询所有NPC的数据，并管理NPC的状态。
 */

var Game = window.Game || {};
Game.Systems = Game.Systems || {};

Game.Systems.NPCSystem = class NPCSystem {
    constructor(scene) {
        this.scene = scene;
        this.npcs = new Map(); // 使用Map来存储NPC数据，以ID作为键
        this.npcStates = new Map(); // 存储NPC的动态状态，如好感度
    }

    /**
     * 初始化系统，加载NPC数据
     */
    init() {
        const npcData = this.scene.cache.json.get('npcs');
        if (!npcData) {
            console.error('NPCSystem: 未能从缓存中加载NPC数据！');
            return;
        }

        for (const npc of npcData) {
            this.npcs.set(npc.id, npc);
            // 初始化NPC状态
            this.npcStates.set(npc.id, {
                affinity: npc.initial_affinity || 0
            });
        }

        console.log('NPC系统已初始化，加载了', this.npcs.size, '个NPC。');
    }

    /**
     * 根据ID获取NPC的静态数据
     * @param {string} id - NPC的唯一ID
     * @returns {object|null} NPC的数据对象
     */
    getNpcDataById(id) {
        return this.npcs.get(id) || null;
    }

    /**
     * 根据ID获取NPC的动态状态
     * @param {string} id - NPC的唯一ID
     * @returns {object|null} NPC的状态对象
     */
    getNpcStateById(id) {
        return this.npcStates.get(id) || null;
    }

    getAllNpcs() {
        return this.npcs;
    }

    /**
     * 调整NPC的好感度
     * @param {string} id - NPC的唯一ID
     * @param {number} amount - 要增加或减少的好感度值
     */
    adjustAffinity(id, amount) {
        if (this.npcStates.has(id)) {
            const state = this.npcStates.get(id);
            state.affinity += amount;
            console.log(`NPC ${id} 的好感度变为: ${state.affinity}`);
            // 发出事件，通知UI更新
            Game.EventBus.emit('affinity-changed', id, state.affinity);
        }
    }
};

// 将NPCSystem挂载到全局Game对象下，方便创建实例
Game.NPCSystem = Game.Systems.NPCSystem;
