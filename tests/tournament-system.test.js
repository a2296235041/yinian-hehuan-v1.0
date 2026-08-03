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
          return saved || { active: null, cooldowns: { internal: 0, spirit: 0 }, history: [] };
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
  console,
  Math,
  Date
};
const context = { window, console, Math, Date };
vm.runInNewContext(source('publish/src/systems/TournamentRules.js'), context);
vm.runInNewContext(source('publish/src/systems/TournamentSystem.js'), context);

async function winRound() {
  await window.GameTournament.recordExchange('第一招', {
    opponentAction: '对手应招',
    narration: '第一回合',
    commentary: '你占上风',
    playerDelta: 30,
    opponentDelta: 10,
    finished: false,
    winner: 'ongoing'
  });
  await window.GameTournament.recordExchange('第二招', {
    opponentAction: '对手变招',
    narration: '第二回合',
    commentary: '优势扩大',
    playerDelta: 30,
    opponentDelta: 10,
    finished: false,
    winner: 'ongoing'
  });
  await window.GameTournament.recordExchange('第三招', {
    opponentAction: '对手绝招',
    narration: '第三回合',
    commentary: '裁判定胜',
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
