'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/PlayerStateSystem.js'),
  'utf8'
);
let restoredTournament = null;
let affinityDay = 1;
const blankTournament = {
  active: null,
  cooldowns: { internal: 0, spirit: 0 },
  history: [],
  corruption: {}
};
const window = {
  Game: {
    player: null,
    Data: { cultivationLevels: {} },
    EventBus: { emit() {} }
  },
  GameTime: {
    normalizeIndex: (value) => Number(value) || 0,
    emitCurrent() {}
  },
  GameInventory: {
    async initialize() {},
    async restore() {},
    getSnapshot: () => ({})
  },
  GameCultivation: {
    async initialize() {},
    async restore() {},
    getSnapshot: () => ({}),
    syncPlayerDailyLimit() {}
  },
  GamePlayerGrowth: {
    async initialize() {},
    async restore() {},
    getSnapshot: () => ({})
  },
  GameAffinity: {
    async restore(value) { affinityDay = value.day; },
    getDay: () => affinityDay
  },
  GameTournament: {
    async restore(value) { restoredTournament = value; }
  },
  GameAI: {
    resetSessions() {},
    restoreSessions() {}
  },
  GameExploration: { initialize() {} },
  GameSaveData: {
    createFreshSnapshot(origin) {
      return {
        player: { origin, day: 1 },
        affinity: { day: 1, records: {} },
        inventory: {},
        cultivation: {},
        growth: {},
        dialogueHistory: { sessions: {} },
        tournament: blankTournament
      };
    }
  },
  console
};
vm.runInNewContext(source, { window, console, Promise, Math, Number });

const scene = {
  cache: {
    json: {
      get(key) {
        if (key === 'items') return [];
        if (key === 'exploration_regions' || key === 'enemies') return [];
        return null;
      }
    }
  }
};
const npcSystem = { async ready() {} };

(async () => {
  await window.GamePlayerState.initialize(scene, { id: 'origin' }, npcSystem, null, true);
  assert.equal(restoredTournament, blankTournament);
  assert.equal(window.Game.player.day, 1);
  console.log('player new game tournament reset test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
