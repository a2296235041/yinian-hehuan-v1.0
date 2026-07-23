var Game = window.Game || {};
Game.Systems = Game.Systems || {};

Game.Systems.DialogueSystem = class DialogueSystem {
    constructor(scene, npcSystem) {
        this.scene = scene;
        this.npcSystem = npcSystem;
        this.currentNpcId = null;
        this.openings = scene.cache.json.get('npc_openings') || {};
        Game.EventBus.on('ai-dialogue-complete', this.handleDialogueComplete, this);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    }

    startDialogue(npcId) {
        const npc = this.npcSystem.getNpcDataById(npcId);
        if (!npc) {
            console.error('DialogueSystem: 找不到 NPC:', npcId);
            return;
        }
        this.currentNpcId = npcId;
        window.GameAI.startDialogue({
            npc,
            building: this.scene.currentBuilding,
            opening: this.openings[npcId] || '……'
        });
    }

    endDialogue() {
        this.currentNpcId = null;
        window.GameAI.closeDialogue();
    }

    isActive() {
        return window.GameAI.isDialogueActive();
    }

    handleDialogueComplete(npcId) {
        if (npcId !== this.currentNpcId) return;
        this.npcSystem.adjustAffinity(npcId, 1);
    }

    destroy() {
        Game.EventBus.off('ai-dialogue-complete', this.handleDialogueComplete, this);
        if (this.isActive()) this.endDialogue();
    }
};

Game.DialogueSystem = Game.Systems.DialogueSystem;
