'use strict';

const assert = require('node:assert/strict');

global.window = globalThis;
require('../publish/src/storage/DialogueHistoryState.v024.js');

const dirty = {
  sessions: {
    npc_one: {
      messages: [
        { role: 'assistant', content: ' 初次见面 ' },
        { role: 'system', content: '不可保存' },
        { role: 'user', content: '你好', promptContent: '你好' },
        { role: 'assistant', content: '幸会' }
      ]
    },
    '../invalid': {
      messages: [{ role: 'user', content: 'bad' }]
    }
  }
};

const clean = GameDialogueHistory.restoreState(dirty);
assert.deepEqual(clean.sessions.npc_one.messages, [
  { role: 'assistant', content: '初次见面' },
  { role: 'user', content: '你好' },
  { role: 'assistant', content: '幸会' }
]);
assert.equal(clean.sessions['../invalid'], undefined);
assert.deepEqual(GameDialogueHistory.exportState(), clean);

const liveMessages = Array.from({ length: 20 }, (_, index) => ({
  role: index % 2 === 0 ? 'user' : 'assistant',
  content: `消息 ${index + 1}`
}));
GameDialogueHistory.sessions.set('npc_live', { messages: liveMessages });
const saved = GameDialogueHistory.exportState();
assert.equal(GameDialogueHistory.sessions.get('npc_live').messages.length, 20);
assert.equal(saved.sessions.npc_live.messages.length, 14);
assert.equal(saved.sessions.npc_live.messages[0].content, '消息 7');
assert.equal(saved.sessions.npc_live.messages.at(-1).content, '消息 20');

GameDialogueHistory.clear();
for (let npcIndex = 1; npcIndex <= 9; npcIndex += 1) {
  GameDialogueHistory.sessions.set(`npc_${npcIndex}`, {
    messages: Array.from({ length: 14 }, (_, messageIndex) => ({
      role: messageIndex % 2 === 0 ? 'user' : 'assistant',
      content: '内'.repeat(500),
      promptContent: messageIndex % 2 === 0 ? '提'.repeat(1200) : undefined
    }))
  });
}
const fullRosterSave = GameDialogueHistory.exportState();
assert.equal(Object.keys(fullRosterSave.sessions).length, 9);
Object.values(fullRosterSave.sessions).forEach((session) => {
  assert.equal(session.messages.length, 14);
});

GameDialogueHistory.clear();
assert.deepEqual(GameDialogueHistory.exportState(), { sessions: {} });

console.log('dialogue history state tests passed');
