'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/ai/PrivateGroupDialogueService.v033.js'),
  'utf8'
);
const events = [];
const recorded = [];
let generated = 0;
let failGeneration = false;
let generatorOptions;
const companions = [
  { id: 'npc_a', name: '沈玉枝', title: '大师姐' },
  { id: 'npc_b', name: '陆千雪', title: '剑侍' },
  { id: 'npc_c', name: '唐妙音', title: '乐师' }
];
const completions = {
  isBusy: () => false,
  cancel() {}
};
const window = {
  GameDialogueHistory: { sessions: new Map() },
  GamefyRecipes: {
    createCompletionsSafe: () => completions,
    createAiJson: (options) => {
      generatorOptions = options;
      return {
      async generate() {
        generated += 1;
        if (failGeneration) throw new Error('AI unavailable');
        return {
          ignored: false,
          source: 'ai',
          value: {
            sceneBeat: '竹影轻晃。',
            responses: [
              { speakerId: 'npc_a', type: 'dialogue', content: '她含笑回应。' },
              { speakerId: 'npc_c', type: 'action', content: '她轻轻摇响玉铃。' }
            ]
          }
        };
      }
      };
    }
  },
  GameAIModels: { whenReady: async () => {}, getDialogueModel: () => 'default' },
  GamePrivateGroupPrompts: {
    sessionId: () => 'private_group_test',
    opening: () => '[scene]众人到场。',
    validate: () => true,
    instructions: () => 'rules',
    userText: () => 'input',
    format: (value) => value.responses.map((item) => item.speakerId).join(',')
  },
  GameAffinity: {
    getSnapshot: () => ({ affinity: 85, relationship: '倾心' })
  },
  GameAI: { closeDialogue() {} },
  Game: {
    EventBus: { emit: (name, payload) => events.push({ name, payload }) }
  },
  game: {
    scene: {
      getScene: () => ({
        npcSystem: {
          async recordDialogue(id) { recorded.push(id); }
        }
      })
    }
  },
  console
};
vm.runInNewContext(source, { window, console, Map, Set, Object });

(async () => {
  assert.equal(window.GamePrivateGroupDialogue.open({
    companions,
    location: { name: '听竹林' }
  }), true);
  const result = await window.GamePrivateGroupDialogue.send('一起听风');
  assert.equal(result.ok, true);
  assert.equal(generated, 1);
  assert.deepEqual(recorded, ['npc_a', 'npc_c']);
  assert.equal(events.some((event) => event.name === 'private-group-render'), true);
  assert.equal(window.GameDialogueHistory.sessions.get('private_group_test').messages.length, 3);
  assert.equal(typeof generatorOptions.fallback, 'function');
  assert.throws(
    () => generatorOptions.fallback({ reason: 'invalid_json' }),
    (error) => error.code === 'AI_INVALID_RESPONSE'
  );
  failGeneration = true;
  const failed = await window.GamePrivateGroupDialogue.send('再说一次');
  assert.equal(failed.ok, false);
  assert.equal(window.GameDialogueHistory.sessions.get('private_group_test').messages.length, 3);
  assert.equal(
    events.some((event) => event.name === 'private-group-status'
      && event.payload.state === 'error'),
    true
  );
  window.GamePrivateGroupDialogue.close();
  assert.equal(window.GamePrivateGroupDialogue.isActive(), false);
  console.log('private group service test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
