'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const listeners = new Map();
const affinityState = {
  day: 1,
  records: {
    su_meier: {
      affinity: 20, dialogueDay: 0, dialogueGain: 0, giftDay: 0, gifts: 0
    }
  }
};
let cultivationState = { realmIndex: 0, progress: 10 };
let storedCheat = { unlimitedStamina: false };
let spiritStones = 100;

const root = {
  Game: {
    player: {
      stamina: 2,
      maxStamina: 12,
      dailyCultivationCount: 1,
      maxDailyCultivation: 5
    },
    Data: {
      cultivationLevels: {
        levels: [
          { name: '炼气', exp_needed: 100 },
          { name: '筑基', exp_needed: 260 },
          { name: '金丹', exp_needed: 1000 }
        ]
      }
    },
    EventBus: {
      on(name, handler) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(handler);
      },
      emit(name, payload) {
        (listeners.get(name) || []).forEach((handler) => handler(payload));
      }
    }
  },
  GamefyRecipes: {
    createVersionedStorage() {
      return {
        load: async () => ({ ...storedCheat }),
        save: async (value) => {
          storedCheat = { ...value };
          return { remote: true, value: storedCheat };
        }
      };
    }
  },
  GameAffinity: {
    ready: async () => undefined,
    exportState: () => structuredClone(affinityState),
    async restore(next) {
      affinityState.day = next.day;
      affinityState.records = structuredClone(next.records);
      return { durable: true };
    },
    getSnapshot(id) {
      const affinity = affinityState.records[id].affinity;
      return { npcId: id, affinity, relationship: affinity >= 85 ? '倾心' : '初识' };
    }
  },
  GameCultivation: {
    ready: async () => undefined,
    async restore(next) {
      cultivationState = { ...next };
      return { durable: true, snapshot: cultivationState };
    }
  },
  GameInventory: {
    ready: async () => undefined,
    async addSpiritStones(amount) {
      spiritStones += amount;
      return { changed: true, balance: spiritStones, durable: true };
    }
  }
};

const context = { window: root, console };
vm.runInNewContext(
  fs.readFileSync('publish/src/storage/PersistenceStatus.js', 'utf8'),
  context
);
vm.runInNewContext(
  fs.readFileSync('publish/src/systems/CheatSystem.v021.js', 'utf8'),
  context
);

(async () => {
  await root.GameCheat.initialize();

  const affinity = await root.GameCheat.setAffinity('su_meier', 999);
  assert.equal(affinity.snapshot.affinity, 100);

  await root.GameCheat.setRealm(2, 'late');
  assert.deepEqual(cultivationState, { realmIndex: 2, progress: 800 });

  await root.GameCheat.setUnlimitedStamina(true);
  assert.equal(root.Game.player.stamina, 12);
  assert.equal(root.Game.player.dailyCultivationCount, 5);

  root.Game.player.stamina = 3;
  root.Game.player.dailyCultivationCount = 0;
  root.Game.EventBus.emit('player-state-changed', {});
  assert.equal(root.Game.player.stamina, 12);
  assert.equal(root.Game.player.dailyCultivationCount, 5);

  await root.GameCheat.setUnlimitedStamina(false);
  assert.equal(root.GameCheat.getSnapshot().unlimitedStamina, false);
  const stones = await root.GameCheat.addSpiritStones();
  assert.equal(stones.balance, 10000099);
  console.log('cheat system tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
