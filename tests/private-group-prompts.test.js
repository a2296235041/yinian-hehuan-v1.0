'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/ai/PrivateGroupPrompts.v033.js'),
  'utf8'
);
const companions = [
  { id: 'npc_a', name: '沈玉枝' },
  { id: 'npc_b', name: '陆千雪' },
  { id: 'npc_c', name: '唐妙音' }
];
const window = {
  GamePlayerIdentity: { get: () => ({ role: '合欢宗弟子', intimacyRule: '' }) },
  GameAffinity: {
    getSnapshot: () => ({ affinity: 85, relationship: '倾心' })
  },
  GameNPCRelations: { promptRule: () => '保持原称呼。' }
};
vm.runInNewContext(source, { window, Set, Map, Math, JSON });

const prompts = window.GamePrivateGroupPrompts;
const minimumReply = '回应'.repeat(60);
const maximumReply = '动作'.repeat(100);
const result = {
  sceneBeat: '三人交换目光。',
  responses: [
    { speakerId: 'npc_a', type: 'dialogue', content: minimumReply },
    { speakerId: 'npc_b', type: 'action', content: maximumReply }
  ]
};
assert.equal(prompts.validate(result, companions.map((npc) => npc.id)), true);
assert.equal(prompts.validate({
  sceneBeat: '',
  responses: [{ speakerId: 'npc_a', type: 'dialogue', content: '短'.repeat(119) }]
}, companions.map((npc) => npc.id)), false);
assert.equal(prompts.validate({
  sceneBeat: '',
  responses: [{ speakerId: 'npc_a', type: 'dialogue', content: '长'.repeat(201) }]
}, companions.map((npc) => npc.id)), false);
assert.equal(prompts.validate({
  sceneBeat: '',
  responses: [{ speakerId: 'unknown', type: 'dialogue', content: '越界' }]
}, companions.map((npc) => npc.id)), false);

const stored = prompts.format(result, companions);
const parsed = prompts.parse(stored, companions);
assert.equal(parsed.some((entry) => entry.speakerName === '沈玉枝'), true);
assert.equal(parsed.some((entry) => entry.type === 'action'), true);
assert.equal(parsed.find((entry) => entry.speakerId === 'npc_a').content.length, 120);
assert.equal(parsed.find((entry) => entry.speakerId === 'npc_b').content.length, 200);
assert.match(prompts.instructions(companions, { name: '听竹林' }), /不少于120字且不多于200字/);
assert.match(prompts.sessionId(companions), /^private_group_[a-z0-9]+$/);
assert.equal('fallback' in prompts, false);
console.log('private group prompts test passed');
