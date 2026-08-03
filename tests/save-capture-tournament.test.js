'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/SaveGameSystem.v021.js'),
  'utf8'
);
let tournamentInitialized = false;
const tournament = {
  active: { mode: 'spirit', phase: 'battle' },
  cooldowns: { internal: 0, spirit: 14 },
  history: [],
  corruption: { rival: 23 }
};
const storage = {
  async load() { return { exists: false, savedAt: null, snapshot: null }; },
  async save(value) { return { remote: true, value }; },
  async clear() {}
};
const window = {
  Game: {
    systemsReady: Promise.resolve(),
    player: { origin: { id: 'origin' } },
    Data: { cultivationLevels: { levels: [] } },
    EventBus: { emit() {} }
  },
  GameSaveData: {
    attributeKeys: ['strength'],
    emptySlot: () => ({ exists: false, savedAt: null, snapshot: null }),
    sanitizeSlot: (value) => value,
    sanitizeSnapshot: (value) => value
  },
  GamefyRecipes: { createVersionedStorage: () => storage },
  GamePlayerState: { ready: async () => window.Game.player },
  GamePlayerGrowth: { exportState: () => ({ bonuses: {} }) },
  GamePlayerStats: { getSnapshot: () => ({ strength: 9 }) },
  GameAffinity: { exportState: () => ({ day: 1, records: {} }) },
  GameCultivation: { exportState: () => ({ realmIndex: 0, progress: 10 }) },
  GameInventory: { exportState: () => ({ quantities: {}, spiritStones: 100 }) },
  GameAI: { exportSessions: () => ({ sessions: {} }) },
  GameTournament: {
    async initialize() { tournamentInitialized = true; },
    exportState() { return tournament; }
  },
  console
};
vm.runInNewContext(source, { window, console, Date, Map, Object, Promise });

(async () => {
  const snapshot = await window.GameSave.captureSnapshot();
  assert.equal(tournamentInitialized, true);
  assert.equal(snapshot.tournament.corruption.rival, 23);
  assert.equal(snapshot.tournament.active.mode, 'spirit');
  console.log('save capture tournament test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
