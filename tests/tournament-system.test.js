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
vm.runInNewContext(source('publish/src/systems/TournamentSystem.js'), context);

async function winRound() {
  await window.GameTournament.recordExchange('第一招', {
    opponentAction: '对手应招',
    narration: '第一回合',
    globalCommentary: '全局来看，你开始控制战斗节奏。',
    battleSummary: '第一回合后，你暂时占优。',
    tacticalHint: '继续压制对手。',
    relationshipChanges: [{ opponentId: 'npc-1', delta: 3, reason: '欣赏你的招式。' }],
    playerDelta: 30,
    opponentDelta: 10,
    finished: false,
    winner: 'ongoing'
  });
  await window.GameTournament.recordExchange('第二招', {
    opponentAction: '对手变招',
    narration: '第二回合',
    globalCommentary: '此前优势在第二回合继续扩大。',
    battleSummary: '第二回合后，对手转入守势。',
    tacticalHint: '抓住对手换气间隙。',
    relationshipChanges: [{ opponentId: 'npc-1', delta: -2, reason: '不满你的追击。' }],
    playerDelta: 30,
    opponentDelta: 10,
    finished: false,
    winner: 'ongoing'
  });
  await window.GameTournament.recordExchange('第三招', {
    opponentAction: '对手绝招',
    narration: '第三回合',
    globalCommentary: '整场比赛的连续压制最终形成胜势。',
    battleSummary: '三回合结束，你取得胜利。',
    tacticalHint: '等待裁判宣布结果。',
    relationshipChanges: [{ opponentId: 'npc-1', delta: 2, reason: '认可你的胜利。' }],
    playerDelta: 30,
    opponentDelta: 10,
    finished: true,
    winner: 'player'
  });
}

(async () => {
  await window.GameTournament.initialize();
  await window.GameTournament.start('internal');
  assert.equal(window.GameTournament.getState().active.round.matches.length, 6);

  await winRound();
  assert.equal(window.GameTournament.getState().active.phase, 'round_complete');
  assert.equal(
    window.GameTournament.getState().active.logs.some((entry) => entry.speaker === '全局战报'),
    true
  );
  assert.equal(
    window.GameTournament.getState().active.logs.some((entry) => entry.speaker === '关系变化'),
    true
  );
  await window.GameTournament.advanceRound();
  assert.equal(window.GameTournament.getState().active.round.matches.length, 3);

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
  console.log('tournament system test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
