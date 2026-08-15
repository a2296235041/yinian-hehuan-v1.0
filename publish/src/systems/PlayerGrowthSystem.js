(function installPlayerGrowthSystem(root) {
  'use strict';

  const allowed = [
    'strength', 'constitution', 'agility', 'intelligence', 'charisma', 'wisdom', 'luck'
  ];
  const ATTRIBUTE_CAP = 9999;
  let state = { bonuses: {} };
  let readyPromise = null;
  let storage = null;
  let mutationQueue = Promise.resolve();
  const persistence = root.GamePersistenceStatus;

  function clamp(value) {
    return Math.max(0, Math.min(ATTRIBUTE_CAP, Math.floor(Number(value) || 0)));
  }

  function baseValue(attribute, origin = root.Game.player?.origin) {
    const base = Number(origin?.attributes?.[attribute]);
    const talentId = origin?.talent?.id || origin?.id || '';
    const talentBonus = talentId === 'mindful_guest'
      && ['intelligence', 'charisma'].includes(attribute) ? 8 : 0;
    return Math.max(0, Math.floor(Number.isFinite(base) ? base : 0)) + talentBonus;
  }

  function maxBonus(attribute, origin) {
    return Math.max(0, ATTRIBUTE_CAP - baseValue(attribute, origin));
  }

  function sanitize(value, origin) {
    const bonuses = {};
    allowed.forEach((key) => {
      const amount = Math.min(clamp(value?.bonuses?.[key]), maxBonus(key, origin));
      if (amount > 0) bonuses[key] = amount;
    });
    return { bonuses };
  }

  function snapshot() {
    return { bonuses: { ...state.bonuses } };
  }

  function queueMutation(action) {
    const task = mutationQueue.then(action, action);
    mutationQueue = task.then(() => undefined, () => undefined);
    return task;
  }

  async function persist(flush) {
    try {
      const result = await storage.save(state, { flush });
      return result.remote === true;
    } catch (error) {
      console.error('永久属性保存失败:', error.code || '', error.message, error.stack);
      return false;
    }
  }

  function initialize() {
    if (readyPromise) return readyPromise;
    storage = root.GamefyRecipes.createVersionedStorage({
      namespace: 'hehuan:',
      key: 'player-growth',
      version: 1,
      fallback: state,
      migrations: { 0: (value) => value || state },
      sanitize
    });
    readyPromise = storage.load()
      .then((saved) => { state = saved; })
      .catch((error) => {
        console.error('永久属性读取失败:', error.code || '', error.message, error.stack);
        root.GameSaveRecovery?.reportStorageReadFailure?.('hehuan:player-growth', error, '永久属性');
        if (root.GameSaveRecovery?.isNewGameMode?.()) return snapshot();
        throw error;
      })
      .then((saved) => saved || snapshot());
    return readyPromise;
  }

  function addBonus(attribute, amount, source = 'item') {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      if (!allowed.includes(attribute)) {
        return persistence.result('永久属性变更', false, true, {
          reason: 'invalid_attribute'
        });
      }
      const gain = clamp(amount);
      if (gain <= 0) {
        return persistence.result('永久属性变更', false, true, {
          reason: 'invalid_amount'
        });
      }
      const before = state.bonuses[attribute] || 0;
      const next = Math.min(clamp(before + gain), maxBonus(attribute));
      const applied = next - before;
      if (applied <= 0) {
        return persistence.result('永久属性变更', false, true, {
          reason: 'max_attribute'
        });
      }
      state.bonuses[attribute] = next;
      const durable = await persist(true);
      root.Game.EventBus.emit('player-state-changed', {
        player: root.Game.player,
        attribute,
        gain: applied,
        source,
        durable
      });
      return persistence.result('永久属性变更', true, durable, {
        attribute, gain: applied, snapshot: snapshot()
      });
    });
  }

  function restore(nextState, origin) {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      state = sanitize(nextState, origin);
      const durable = await persist(true);
      root.Game.EventBus.emit('player-state-changed', { player: root.Game.player, source: 'load' });
      return persistence.result('永久属性恢复', true, durable, { snapshot: snapshot() });
    });
  }

  root.GamePlayerGrowth = {
    initialize,
    ready: () => readyPromise || Promise.resolve(snapshot()),
    getSnapshot: snapshot,
    getBonus: (attribute) => state.bonuses[attribute] || 0,
    addBonus,
    exportState: snapshot,
    restore
  };
}(window));
