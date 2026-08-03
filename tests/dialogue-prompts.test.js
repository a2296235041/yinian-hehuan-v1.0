'use strict';

const assert = require('node:assert/strict');

global.window = globalThis;
global.Game = { player: { origin: { gender: 'male' } } };
global.GamePlayerStats = {
  getSnapshot: () => ({
    originName: '测试修士',
    talentName: '测试天赋',
    talentId: 'mindful_guest'
  })
};

require('../publish/src/data/PlayerIdentity.v001.js');
require('../publish/src/data/NPCRelations.v025.js');
require('../publish/src/ai/DialoguePrompts.v025.js');

const messages = Array.from({ length: 20 }, (_, index) => ({
  role: index % 2 === 0 ? 'user' : 'assistant',
  content: `历史消息 ${index + 1}`
}));
const prompt = GameDialoguePrompts.conversation({
  npc: {
    name: '测试 NPC',
    title: '执事',
    realm_label: '筑基',
    personality: '沉静'
  },
  building: { name: '测试地点' },
  messages
}, {
  affinity: 10,
  relationship: '初识'
});
const context = prompt.slice(1);

assert.equal(context.length, 14);
assert.equal(context[0].content, '历史消息 7');
assert.equal(context.at(-1).content, '历史消息 20');
assert.ok(context.reduce((total, message) => total + message.content.length, 0) <= 5000);

console.log('dialogue prompt context tests passed');
