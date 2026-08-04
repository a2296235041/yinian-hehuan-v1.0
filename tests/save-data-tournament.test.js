'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function source(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const window = {
  GameDialogueHistory: {
    sanitize(value) {
      return value && typeof value === 'object' ? value : { sessions: {} };
    }
  }
};
const context = { window, Math, JSON, Object };
vm.runInNewContext(source('publish/src/storage/TournamentState.js'), context);
vm.runInNewContext(source('publish/src/storage/SaveData.v025.js'), context);

const legacy = window.GameSaveData.sanitizeSnapshot({
  player: { day: 8 },
  affinity: { day: 8, records: {} }
});
assert.deepEqual(plain(legacy.tournament), {
  active: null,
  cooldowns: { internal: 0, spirit: 0 },
  history: [],
  corruption: {}
});

const sanitized = window.GameSaveData.sanitizeSnapshot({
  player: { day: 8 },
  affinity: { day: 8, records: {} },
  growth: { bonuses: { strength: 12000, agility: 37 } },
  tournament: {
    active: { mode: 'spirit', phase: 'battle' },
    cooldowns: { internal: -3, spirit: 17.8 },
    history: Array.from({ length: 15 }, (_, index) => ({ index })),
    corruption: { valid_npc: 140, lowered: -9, 'invalid id': 50 }
  },
  inventory: { quantities: {}, spiritStones: 10000099 }
});
assert.equal(sanitized.tournament.active.mode, 'spirit');
assert.deepEqual(plain(sanitized.tournament.cooldowns), { internal: 0, spirit: 17 });
assert.equal(sanitized.tournament.history.length, 12);
assert.deepEqual(plain(sanitized.tournament.corruption), { valid_npc: 100, lowered: 0 });
assert.equal(sanitized.inventory.spiritStones, 10000099);
assert.equal(sanitized.growth.bonuses.strength, 9999);
assert.equal(sanitized.growth.bonuses.agility, 37);

const cappedGrowth = window.GameSaveData.sanitizeSnapshot({
  player: {
    day: 1,
    origin: {
      id: 'origin-cap',
      name: '上限测试',
      attributes: { strength: 52 }
    }
  },
  affinity: { day: 1, records: {} },
  growth: { bonuses: { strength: 12000 } }
});
assert.equal(cappedGrowth.growth.bonuses.strength, 9947);
assert.equal(cappedGrowth.attributes.effective.strength, 9999);

const fresh = window.GameSaveData.createFreshSnapshot(
  { id: 'origin-1', name: '测试弟子', attributes: {} },
  []
);
assert.deepEqual(plain(fresh.tournament), plain(legacy.tournament));
console.log('save data tournament test passed');
