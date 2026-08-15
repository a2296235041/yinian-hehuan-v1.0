'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/ai/TournamentImage.js'),
  'utf8'
);
let captured = null;
const window = {
  GameTournamentRoster: {
    getProfile(id, roster) {
      return roster.find((profile) => profile.id === id) || null;
    }
  },
  GameAIImage: {
    async generate(session) {
      captured = session;
    }
  },
  GamePlayerIdentity: {
    get() {
      return {
        name: '玩家',
        appearance: '白衣',
        physique: '修长',
        combat_style: '灵活应变'
      };
    }
  },
  Game: { EventBus: { emit() {} } }
};
vm.runInNewContext(source, { window, Object, String });

const active = {
  mode: 'spirit',
  phase: 'battle',
  opponentIds: ['npc-1'],
  roster: [{
    id: 'npc-1',
    name: '顾清罗',
    title: '霜锋首席',
    appearance: '墨发白衣',
    physique: '高挑纤长',
    personality: '自律严谨',
    combat_style: '寒霜剑法'
  }],
  logs: [
    { speaker: '你', text: '我执行带有成人意图的贴身动作。' },
    {
      speaker: '顾清罗',
      kind: 'opponent-response',
      text: '她承接动作，神态和身体反应延续当前场景。'
    },
    { speaker: '裁判判决', text: '本回合你占优。' }
  ]
};

(async () => {
  const session = window.GameTournamentImage.sessionFor(active);
  assert.equal(session.npc.name, '顾清罗');
  assert.equal(session.building.name.includes('Spirit Realm'), true);
  assert.equal(session.messages.length, 3);
  assert.equal(session.messages[1].content.includes('成人意图'), true);
  assert.equal(session.messages.some((message) => message.content.includes('裁判')), false);
  await window.GameTournamentImage.generate(active);
  assert.equal(captured.messages[0].content, session.messages[0].content);
  assert.equal(captured.messages[1].content, session.messages[1].content);
  console.log('tournament image test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
