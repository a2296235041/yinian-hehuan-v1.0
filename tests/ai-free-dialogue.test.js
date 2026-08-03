'use strict';

const assert = require('node:assert/strict');

global.window = globalThis;
require('../publish/src/ai/CompletionsSafe.v022.js');
require('../publish/src/storage/DialogueHistoryState.v024.js');

const completionPayloads = [];
const emitted = [];
const traces = [];
global.GameTrace = (scope, eventName, details) => {
  traces.push({ scope, eventName, details });
};

global.dzmm = {
  completions: async (payload, onContent) => {
    completionPayloads.push(payload);
    onContent('NPC 已收到并回复', true);
  }
};
global.GameAIModels = {
  whenReady: async () => {},
  getDialogueModel: () => 'default'
};
global.GameAffinity = {
  getSnapshot: () => ({ affinity: 10, relationship: '初识' })
};
global.Game = {
  EventBus: {
    emit: (name, data) => emitted.push({ name, data })
  }
};
global.GameAIImage = {
  cancel() {},
  generate() {}
};
global.GameDialogueGreetings = {
  generate: async () => ({ text: '开场白', failed: false })
};
global.GameDialoguePrompts = {
  conversation: (session) => session.messages.map((message) => ({
    role: message.role,
    content: message.promptContent || message.content
  }))
};
global.GameAIText = {
  clean: (text, fallback = '') => String(text || fallback).trim()
};
global.GameNPCGiftInteraction = { handle: async () => {} };

require('../publish/src/ai/AIService.v016.js');

(async () => {
  await GameAI.startDialogue({
    npc: { id: 'npc-test', name: '测试 NPC', title: '执事', realm_label: '筑基' },
    building: { name: '测试地点' },
    opening: '本地开场'
  });
  for (let index = 1; index <= 8; index += 1) {
    await GameAI.send(`自由输入消息 ${index}`);
  }

  assert.equal(completionPayloads.length, 8);
  assert.equal(completionPayloads[0].model, 'default');
  assert.equal(completionPayloads[0].messages.at(-1).content, '自由输入消息 1');
  const finalRender = emitted.filter((event) => event.name === 'ai-dialogue-render').at(-1);
  assert.equal(finalRender.data.messages.length, 17);
  assert.deepEqual(finalRender.data.messages.slice(-2), [
    { role: 'user', content: '自由输入消息 8', promptContent: '自由输入消息 8' },
    { role: 'assistant', content: 'NPC 已收到并回复' }
  ]);
  assert.ok(traces.some((entry) => entry.eventName === 'send-received'));
  assert.ok(traces.some((entry) => entry.eventName === 'request-start'));
  assert.ok(traces.some((entry) => entry.eventName === 'request-result'));

  const savedHistory = GameAI.exportSessions();
  assert.equal(savedHistory.sessions['npc-test'].messages.length, 14);
  assert.equal(savedHistory.sessions['npc-test'].messages[0].content, '自由输入消息 2');
  GameAI.resetSessions();
  GameAI.restoreSessions(savedHistory);
  await GameAI.startDialogue({
    npc: { id: 'npc-test', name: '测试 NPC', title: '执事', realm_label: '筑基' },
    building: { name: '测试地点' },
    opening: '本地开场'
  });
  const restoredRender = emitted.filter((event) => event.name === 'ai-dialogue-render').at(-1);
  assert.equal(restoredRender.data.messages.length, 15);
  assert.equal(restoredRender.data.messages[0].content, '自由输入消息 2');

  console.log('AI free dialogue integration test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
