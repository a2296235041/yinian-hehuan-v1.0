(function installInventorySystem(root) {
  'use strict';
  const STARTING_SPIRIT_STONES = 100;
  const SPIRIT_STONE_CAP = 999999999;
  const catalog = new Map();
  let state = { quantities: {}, spiritStones: STARTING_SPIRIT_STONES };
  let storage = null;
  let readyPromise = null;
  let mutationQueue = Promise.resolve();
  const clampQuantity = (value) => Math.max(0, Math.min(9999, Math.floor(Number(value) || 0)));
  const clampSpiritStones = (value) => (
    Math.max(0, Math.min(SPIRIT_STONE_CAP, Math.floor(Number(value) || 0)))
  );
  function fallbackState() {
    const quantities = {};
    catalog.forEach((item) => {
      const amount = clampQuantity(item.initial_quantity);
      if (amount > 0) quantities[item.id] = amount;
    });
    return { quantities, spiritStones: STARTING_SPIRIT_STONES };
  }

  function sanitize(value) {
    const savedStones = Number(value?.spiritStones);
    const clean = {
      quantities: {},
      spiritStones: Number.isFinite(savedStones)
        ? clampSpiritStones(savedStones)
        : STARTING_SPIRIT_STONES
    };
    Object.entries(value?.quantities || {}).forEach(([id, amount]) => {
      if (!catalog.has(id)) return;
      const quantity = clampQuantity(amount);
      if (quantity > 0) clean.quantities[id] = quantity;
    });
    return clean;
  }

  function snapshot() {
    return {
      spiritStones: state.spiritStones,
      items: [...catalog.values()].map((item) => ({
        ...item,
        quantity: state.quantities[item.id] || 0
      }))
    };
  }

  function emitChange(itemId, delta, durable, source) {
    root.Game.EventBus.emit('inventory-changed', {
      itemId,
      delta,
      durable,
      source,
      snapshot: snapshot()
    });
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
      console.error('储物袋保存失败:', error.code || '', error.message, error.stack);
      return false;
    }
  }

  function initialize(items) {
    if (readyPromise) return readyPromise;
    (items || []).forEach((item) => {
      if (item?.id) catalog.set(item.id, { ...item });
    });
    storage = root.GamefyRecipes.createVersionedStorage({
      namespace: 'hehuan:',
      key: 'inventory',
      version: 2,
      fallback: fallbackState(),
      migrations: {
        0(value) {
          return value && typeof value === 'object' ? value : fallbackState();
        },
        1(value) {
          return {
            ...(value && typeof value === 'object' ? value : fallbackState()),
            spiritStones: STARTING_SPIRIT_STONES
          };
        }
      },
      sanitize
    });
    readyPromise = storage.load()
      .then((saved) => { state = saved; })
      .catch((error) => {
        state = fallbackState();
        console.error('储物袋读取失败:', error.code || '', error.message, error.stack);
      })
      .then(() => {
        root.Game.EventBus.emit('inventory-ready', snapshot());
        return snapshot();
      });
    return readyPromise;
  }

  function add(itemId, amount, source = 'reward') {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      const item = catalog.get(itemId);
      const delta = clampQuantity(amount);
      if (!item || delta <= 0) return { changed: false, reason: 'invalid_item' };
      state.quantities[itemId] = clampQuantity((state.quantities[itemId] || 0) + delta);
      const durable = await persist(false);
      emitChange(itemId, delta, durable, source);
      return { changed: true, item, quantity: state.quantities[itemId], durable };
    });
  }

  function remove(itemId, amount, source = 'consume') {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      const item = catalog.get(itemId);
      const delta = clampQuantity(amount);
      const owned = state.quantities[itemId] || 0;
      if (!item || delta <= 0) return { changed: false, reason: 'invalid_item' };
      if (owned < delta) return { changed: false, reason: 'insufficient', item, quantity: owned };
      const next = owned - delta;
      if (next > 0) state.quantities[itemId] = next;
      else delete state.quantities[itemId];
      const durable = await persist(true);
      emitChange(itemId, -delta, durable, source);
      return { changed: true, item, quantity: next, durable };
    });
  }

  function exportState() {
    return { quantities: { ...state.quantities }, spiritStones: state.spiritStones };
  }

  function addSpiritStones(amount, source = 'reward') {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      const delta = clampSpiritStones(amount);
      if (delta <= 0) return { changed: false, reason: 'invalid_amount' };
      const next = clampSpiritStones(state.spiritStones + delta);
      const applied = next - state.spiritStones;
      if (applied <= 0) return { changed: false, reason: 'max_amount' };
      state.spiritStones = next;
      const durable = await persist(false);
      emitChange('spirit_stones', applied, durable, source);
      return { changed: true, balance: state.spiritStones, durable };
    });
  }

  function removeSpiritStones(amount, source = 'purchase') {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      const delta = clampSpiritStones(amount);
      if (delta <= 0) return { changed: false, reason: 'invalid_amount' };
      if (state.spiritStones < delta) {
        return { changed: false, reason: 'insufficient', balance: state.spiritStones };
      }
      state.spiritStones -= delta;
      const durable = await persist(true);
      emitChange('spirit_stones', -delta, durable, source);
      return { changed: true, balance: state.spiritStones, durable };
    });
  }

  function restore(nextState) {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      state = sanitize(nextState);
      const durable = await persist(true);
      emitChange(null, 0, durable, 'load');
      return { durable, snapshot: snapshot() };
    });
  }
  root.GameInventory = {
    initialize,
    ready: () => readyPromise || Promise.resolve(snapshot()),
    getSnapshot: snapshot,
    getItem: (id) => catalog.get(id) || null,
    getQuantity: (id) => state.quantities[id] || 0,
    getSpiritStones: () => state.spiritStones,
    getGiftableItems: () => snapshot().items
      .filter((item) => item.quantity > 0 && Number(item.gift_affinity) > 0),
    add,
    remove,
    addSpiritStones,
    removeSpiritStones,
    exportState,
    restore
  };
}(window));
