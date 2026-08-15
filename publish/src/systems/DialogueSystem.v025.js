var Game = window.Game || {};
Game.Systems = Game.Systems || {};

Game.Systems.DialogueSystem = class DialogueSystem {
    constructor(scene, npcSystem) {
        this.scene = scene;
        this.npcSystem = npcSystem;
        this.currentNpcId = null;
        this.startSeq = 0;
        this.openings = scene.cache.json.get('npc_openings') || {};
        Game.EventBus.on('ai-dialogue-complete', this.handleDialogueComplete, this);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    }

    async startDialogue(npcId, context = {}) {
        // 同一面板内重复点到当前 NPC 时继续原会话，避免重新生成开场白和清空历史。
        if (this.currentNpcId === npcId && window.GameAI.isDialogueActive()) return;
        const npc = this.npcSystem.getNpcDataById(npcId);
        if (!npc) {
            console.error('DialogueSystem: 找不到 NPC:', npcId);
            return;
        }
        const seq = ++this.startSeq;
        await this.npcSystem.ready();
        if (seq !== this.startSeq) return;
        this.currentNpcId = npcId;
        window.GameAI.startDialogue({
            npc,
            building: context.building || this.scene.currentBuilding,
            opening: window.GamePlayerIdentity.choose(this.openings[npcId], '……')
        });
    }

    endDialogue() {
        this.startSeq += 1;
        this.currentNpcId = null;
        window.GameAI.closeDialogue();
    }

    isActive() {
        return window.GameAI.isDialogueActive();
    }

    async handleDialogueComplete(npcId) {
        if (npcId !== this.currentNpcId) return;
        const result = await this.npcSystem.recordDialogue(npcId);
        Game.EventBus.emit('npc-dialogue-completed', { npcId });
        if (npcId !== this.currentNpcId) return;
        window.GamePersistenceStatus?.report?.('好感度变更', result);
        Game.EventBus.emit('affinity-notice', {
            snapshot: result.snapshot,
            message: result.changed
                ? `交谈好感 +${result.gain || 1}${result.syncMessage ? `，${result.syncMessage}` : ''}`
                : '今日交谈提升已达 5/5'
        });
    }

    destroy() {
        Game.EventBus.off('ai-dialogue-complete', this.handleDialogueComplete, this);
        if (this.isActive()) this.endDialogue();
    }
};

Game.DialogueSystem = Game.Systems.DialogueSystem;
