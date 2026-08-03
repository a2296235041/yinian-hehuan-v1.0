'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/scenes/GameScene.js'),
  'utf8'
);
const opened = [];
let narrativeCalls = 0;
const window = {
  Game: {
    player: { stamina: 2, maxStamina: 5 },
    EventBus: { emit() {} }
  },
  GameAffinity: {
    getSnapshot: () => ({ affinity: 90 })
  },
  GameCultivation: {
    getSnapshot: () => ({ canBreakthrough: false }),
    addCultivationPercent: async () => ({ changed: true })
  },
  GamePrivateGroupDialogue: {
    open: (payload) => opened.push(payload)
  },
  GameNarrative: {
    async generateDetailed() {
      narrativeCalls += 1;
      throw new Error('invite flow must not request a narrative');
    }
  },
  GameAudio: { sfx() {} }
};
const Phaser = {
  Scene: class {},
  Scenes: { Events: { SHUTDOWN: 'shutdown' } },
  BlendModes: { MULTIPLY: 0 }
};

vm.runInNewContext(source, { window, Phaser, console, Set, Math, Number });

(async () => {
  const scene = Object.create(window.Game.Scenes.PrivateScene.prototype);
  const companion = { id: 'npc_a', name: '沈玉枝' };
  scene.busy = false;
  scene.selectedInviteIds = new Set(['npc_a']);
  scene.inviteMenuVisible = true;
  scene.invitedNpcs = [];
  scene.talkMenuVisible = false;
  scene.sceneIndex = 0;
  scene.locations = [{ name: '听竹林' }];
  scene.inviteButton = { setText() {} };
  scene.talkButton = { setVisible() {} };
  scene.statusText = { setText() { return this; }, setVisible() { return this; } };
  scene.storyText = { setVisible() { return this; } };
  scene.renderInvites = () => {};
  scene.renderTalkMenu = () => {};

  await scene.inviteNpcs([companion]);

  assert.equal(narrativeCalls, 0);
  assert.equal(opened.length, 1);
  assert.deepEqual(opened[0].companions, [companion]);
  assert.equal(opened[0].location.name, '听竹林');
  assert.equal(window.Game.player.stamina, 1);
  assert.equal(scene.busy, false);
  console.log('private group invite flow test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
