'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function source(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

let saved = null;
let stones = 0;
const affinities = {};
const roster = Array.from({ length: 12 }, (_, index) => ({
  id: index === 0 ? 'player' : `npc-${index}`,
  name: index === 0 ? '你' : `NPC ${index}`,
  faction: '合欢宗',
  title: '参赛者',
  power: 50 + index
}));
const window = {
  Game: {
    player: { day: 1 },
    EventBus: { emit() {} }
  },
  GamefyRecipes: {
    createVersionedStorage() {
      return {
        async load() {
          return saved || {
            active: null,
            cooldowns: { internal: 0, spirit: 0 },
            history: [],
            corruption: {}
          };
        },
        async save(value) {
          saved = JSON.parse(JSON.stringify(value));
          return { remote: true, value: saved };
        },
        async clear() { saved = null; }
      };
    }
  },
  GameTournamentRoster: {
    PLAYER_ID: 'player',
    build() { return JSON.parse(JSON.stringify(roster)); }
  },
  GameInventory: {
    async addSpiritStones(amount) {
      stones += amount;
      return { changed: true, balance: stones };
    }
  },
  GameAffinity: {
    async adjust(id, delta) {
      affinities[id] = (affinities[id] || 0) + delta;
      return { changed: delta !== 0, delta };
    }
  },
  console,
  Math,
  Date
};
const context = { window, console, Math, Date };
vm.runInNewContext(source('publish/src/systems/TournamentRules.js'), context);
vm.runInNewContext(source('publish/src/systems/TournamentBattleState.js'), context);
vm.runInNewContext(source('publish/src/systems/TournamentRelations.js'), context);
vm.runInNewContext(source('publish/src/storage/TournamentState.js'), context);
vm.runInNewContext(source('publish/src/systems/TournamentSystem.js'), context);

async function winRound() {
  await window.GameTournament.recordExchange('第一招', {
    response: 'NPC 7退守后立即稳住架势，抬眼向你回应：“这一招我接下了，继续。”',
    verdict: '裁判判决：你 +30 点，对手 +10 点。你取得主动。',
    relationshipChanges: [{ opponentId: 'npc-1', delta: 3, reason: '欣赏你的招式。' }],
    playerDelta: 30,
    opponentDelta: 10,
    finished: false,
    winner: 'ongoing'
  });
  await window.GameTournament.recordExchange('第二招', {
    response: '对手仓促变招后重新贴近，沉声说道：“别以为我会一直后退。”',
    verdict: '裁判判决：你 +30 点，对手 +10 点。优势继续扩大。',
    relationshipChanges: [{ opponentId: 'npc-1', delta: -2, reason: '不满你的追击。' }],
    playerDelta: 30,
    opponentDelta: 10,
    finished: false,
    winner: 'ongoing'
  });
  await window.GameTournament.recordExchange('第三招', {
    response: '对手的绝招被化解后缓缓收势，直视着你承认：“这一场，是你赢了。”',
    verdict: '裁判判决：你 +30 点，对手 +10 点。三回合总分由你领先。',
    relationshipChanges: [{ opponentId: 'npc-1', delta: 2, reason: '认可你的胜利。' }],
    playerDelta: 30,
    opponentDelta: 10,
    finished: true,
    winner: 'player'
  });
}

(async () => {
  await window.GameTournament.initialize();
  await window.GameTournament.start('internal', 'npc-7');
  assert.equal(window.GameTournament.getState().active.round.matches.length, 6);
  assert.deepEqual(
    Array.from(window.GameTournament.getState().active.opponentIds),
    ['npc-7']
  );
  assert.equal(
    window.GameTournament.getState().active.logs.some((entry) => entry.text.includes('篡改')),
    true
  );

  await winRound();
  assert.equal(window.GameTournament.getState().active.phase, 'round_complete');
  assert.equal(
    window.GameTournament.getState().active.logs.some((entry) => (
      entry.kind === 'opponent-response'
        && entry.speaker === 'NPC 7'
        && entry.text.startsWith('退守后')
    )),
    true
  );
  assert.equal(
    window.GameTournament.getState().active.logs.some((entry) => entry.speaker === '裁判判决'),
    true
  );
  assert.equal(
    window.GameTournament.getState().active.logs.some((entry) => (
      entry.speaker === '裁判判决' && entry.text.startsWith('裁判判决')
    )),
    false
  );
  assert.equal(
    window.GameTournament.getState().active.logs.some((entry) => entry.speaker === '关系变化'),
    false
  );
  const nextOpponent = window.GameTournament.getState().active.pendingEntrants
    .find((id) => id !== 'player');
  await window.GameTournament.advanceRound(nextOpponent);
  assert.equal(window.GameTournament.getState().active.round.matches.length, 3);
  assert.deepEqual(
    Array.from(window.GameTournament.getState().active.opponentIds),
    [nextOpponent]
  );

  await winRound();
  await window.GameTournament.advanceRound();
  assert.equal(window.GameTournament.getState().active.round.matches[0].participants.length, 3);

  await winRound();
  const completed = window.GameTournament.getState();
  assert.equal(completed.active.phase, 'event_complete');
  assert.equal(completed.active.playerWon, true);
  assert.equal(completed.cooldowns.internal, 11);

  await window.GameTournament.claimReward();
  assert.equal(stones, 120);
  assert.equal(window.GameTournament.getState().active.rewardClaimed, true);

  const exported = window.GameTournament.exportState();
  exported.corruption['npc-2'] = 24;
  await window.GameTournament.restore(exported);
  assert.equal(window.GameTournament.getState().corruption['npc-2'], 24);

  await window.GameTournament.restore(null);
  assert.deepEqual(JSON.parse(JSON.stringify(window.GameTournament.getState())), {
    active: null,
    cooldowns: { internal: 0, spirit: 0 },
    history: [],
    corruption: {}
  });
  console.log('tournament system test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
