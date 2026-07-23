/**
 * @file DialogueSystem.js
 * @description 对话系统
 * 负责加载、解析和管理NPC的对话流程。
 */

var Game = window.Game || {};
Game.Systems = Game.Systems || {};

Game.Systems.DialogueSystem = class DialogueSystem {
    constructor(scene, npcSystem) {
        this.scene = scene;
        this.npcSystem = npcSystem; // 引用NPC系统，用于修改好感度等
        this.activeDialogue = null; // 当前激活的对话数据
        this.currentNode = null; // 当前对话节点
        this.currentNpcId = null; // 当前对话的NPC ID
    }

    /**
     * 开始一段对话
     * @param {string} npcId - 要对话的NPC的ID
     */
    startDialogue(npcId) {
        const npcData = this.npcSystem.getNpcDataById(npcId);
        if (!npcData) {
            console.error(`DialogueSystem: 无法为NPC ${npcId} 开始对话，找不到NPC数据。`);
            return;
        }

        // 从缓存加载该NPC的对话文件
        this.activeDialogue = this.scene.cache.json.get(npcData.dialogue_file.replace('.json', ''));
        if (!this.activeDialogue) {
            console.error(`DialogueSystem: 无法加载NPC ${npcId} 的对话文件: ${npcData.dialogue_file}`);
            return;
        }

        this.currentNpcId = npcId;
        this.currentNode = this.activeDialogue.nodes[this.activeDialogue.start_node];

        // 发出事件，通知UI更新
        Game.EventBus.emit('update-dialogue-ui', {
            npcName: npcData.name,
            npcText: this.currentNode.npc_text,
            playerOptions: this.currentNode.player_options
        });
    }

    /**
     * 玩家选择一个对话选项
     * @param {number} optionIndex - 玩家选择的选项索引
     */
    chooseOption(optionIndex) {
        if (!this.currentNode || !this.currentNode.player_options) return;

        const choice = this.currentNode.player_options[optionIndex];
        if (!choice) return;

        // 1. 调整好感度
        if (choice.affinity_change) {
            this.npcSystem.adjustAffinity(this.currentNpcId, choice.affinity_change);
        }

        // 2. 移动到下一个对话节点
        const nextNodeKey = choice.next_node;
        this.currentNode = this.activeDialogue.nodes[nextNodeKey];

        // 3. 检查对话是否结束
        if (nextNodeKey === 'end' || !this.currentNode || this.currentNode.end_dialogue) {
            this.endDialogue();
            return;
        }

        // 4. 发出事件，更新UI
        const npcData = this.npcSystem.getNpcDataById(this.currentNpcId);
        Game.EventBus.emit('update-dialogue-ui', {
            npcName: npcData.name,
            npcText: this.currentNode.npc_text,
            playerOptions: this.currentNode.player_options
        });
    }

    /**
     * 结束当前对话
     */
    endDialogue() {
        this.activeDialogue = null;
        this.currentNode = null;
        this.currentNpcId = null;
        Game.EventBus.emit('hide-dialogue-ui');
        console.log('对话结束。');
    }
};

// 将DialogueSystem挂载到全局Game对象下，方便创建实例
Game.DialogueSystem = Game.Systems.DialogueSystem;
