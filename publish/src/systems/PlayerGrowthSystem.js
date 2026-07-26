(function installPlayerGrowthSystem(root) {
  'use strict';

  const allowed = ['strength', 'constitution', 'agility', 'intelligence', 'wisdom', 'luck'];
  let state = { bonuses: {} };
  let readyPromise = null;
  let storage = null;
  let mutationQueue = Promise.resolve();

  function clamp(value) {
    return Math.max(0, Math.min(999, Math.floor(Number(value) || 0)));
  }

  function sanitize(value) {
    const bonuses = {};
    allowed.forEach((key) => {
      const amount = clamp(value?.bonuses?.[key]);
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
      })
      .then(() => snapshot());
    return readyPromise;
  }

  function addBonus(attribute, amount, source = 'item') {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      if (!allowed.includes(attribute)) return { changed: false, reason: 'invalid_attribute' };
      const gain = clamp(amount);
      if (gain <= 0) return { changed: false, reason: 'invalid_amount' };
      state.bonuses[attribute] = clamp((state.bonuses[attribute] || 0) + gain);
      const durable = await persist(true);
      root.Game.EventBus.emit('player-state-changed', {
        player: root.Game.player,
        attribute,
        gain,
        source,
        durable
      });
      return { changed: true, attribute, gain, durable, snapshot: snapshot() };
    });
  }

  function restore(nextState) {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      state = sanitize(nextState);
      const durable = await persist(true);
      root.Game.EventBus.emit('player-state-changed', { player: root.Game.player, source: 'load' });
      return { durable, snapshot: snapshot() };
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
