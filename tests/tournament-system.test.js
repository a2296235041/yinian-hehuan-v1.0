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
let realmIndex = 0;
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
  GameCultivation: {
    getSnapshot: () => ({ realmIndex })
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
vm.runInNewContext(source('publish/src/systems/TournamentDecision.js'), context);
vm.runInNewContext(source('publish/src/systems/TournamentRelations.js'), context);
vm.runInNewContext(source('publish/src/storage/TournamentState.js'), context);
vm.runInNewContext(source('publish/src/systems/TournamentSystem.js'), context);

async function winRound() {
  const opponentId = window.GameTournament.getState().active.opponentIds[0];
  for (let turn = 1; turn <= 4; turn += 1) {
    await window.GameTournament.recordExchange(`第${turn}招`, {
      response: turn === 1
        ? '对手退守后立即稳住架势，抬眼向你回应：“这一招我接下了，继续。”'
        : '对手承受攻势后仍留在擂台中央，继续等待你的下一步行动。',
      verdict: `裁判判决：你 +30 点，对手 +10 点。第${turn}回合由你占优。`,
      relationshipChanges: [{
        opponentId,
        delta: turn % 2 === 0 ? -2 : 3,
        reason: '本回合改变了她对你的判断。'
      }],
      playerDelta: 30,
      opponentDelta: 10,
      finished: false,
      winner: 'ongoing'
    });
  }
  await assert.rejects(
    () => window.GameTournament.requestDecision(),
    /至少完成 5 回合/
  );
  await window.GameTournament.recordExchange('第5招', {
    response: '对手承受最后一轮攻势后稳住身形，等待你是否请求裁判作出终判。',
    verdict: '裁判判决：你 +30 点，对手 +10 点。第5回合由你占优。',
    relationshipChanges: [{
      opponentId,
      delta: 3,
      reason: '最后一回合改变了她对你的判断。'
    }],
    playerDelta: 30,
    opponentDelta: 10,
    finished: true,
    winner: 'player'
  });
  const pending = window.GameTournament.getState().active;
  assert.equal(pending.turn, 5);
  assert.equal(pending.phase, 'battle');
  await window.GameTournament.requestDecision();
}

(async () => {
  await window.GameTournament.initialize();
  assert.equal(window.GameTournament.getAccess('internal').unlocked, false);
  await assert.rejects(
    () => window.GameTournament.start('internal'),
    /筑基期/
  );
  realmIndex = 1;
  assert.equal(window.GameTournament.getAccess('internal').unlocked, true);
  assert.equal(window.GameTournament.getAccess('spirit').unlocked, false);
  await assert.rejects(
    () => window.GameTournament.start('spirit'),
    /元婴期/
  );
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
  await assert.rejects(
    () => window.GameTournament.requestDecision(),
    /至少完成 5 回合/
  );

  await winRound();
  assert.equal(window.GameTournament.getState().active.phase, 'round_complete');
  assert.equal(
    window.GameTournament.getState().active.logs.some((entry) => (
      entry.kind === 'opponent-response'
        && entry.speaker === 'NPC 7'
        && entry.text.startsWith('对手退守后')
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
  assert.equal(
    window.GameTournament.getState().active.logs.some((entry) => entry.speaker === '裁判终判'),
    true
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
