/**
 * @file NPCManager.js
 * @description NPC数据管理器
 * 负责加载、存储和查询所有NPC的数据。
 */

var Game = window.Game || {};
Game.Utils = Game.Utils || {};

Game.Utils.NPCManager = class NPCManager {
    constructor(scene) {
        this.scene = scene;
        this.npcs = new Map(); // 使用Map来存储NPC数据，以ID作为键，方便快速查找
    }

    /**
     * 初始化管理器，加载NPC数据
     */
    init() {
        const npcData = this.scene.cache.json.get('npcs');
        if (!npcData) {
            console.error('NPCManager: 未能从缓存中加载NPC数据！');
            return;
        }

        for (const npc of npcData) {
            this.npcs.set(npc.id, npc);
        }

        console.log('NPC管理器已初始化，加载了', this.npcs.size, '个NPC。');
    }

    /**
     * 根据ID获取NPC数据
     * @param {string} id - NPC的唯一ID
     * @returns {object|null} NPC的数据对象，如果未找到则返回null
     */
    getNpcById(id) {
        if (this.npcs.has(id)) {
            return this.npcs.get(id);
        }
        console.warn(`NPCManager: 未找到ID为 "${id}" 的NPC。`);
        return null;
    }

    /**
     * 获取所有NPC的数据
     * @returns {Map<string, object>} 包含所有NPC数据的Map
     */
    getAllNpcs() {
        return this.npcs;
    }
};

// 将NPCManager挂载到全局Game对象下，方便创建实例
Game.NPCManager = Game.Utils.NPCManager;
