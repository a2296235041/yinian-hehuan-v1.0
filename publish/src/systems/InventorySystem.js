(function installInventorySystem(root) {
  'use strict';

  // 储物袋只保存“物品 ID -> 数量”，名称和说明始终从配置表读取。
  // 这样以后修改物品文案或新增掉落时，不需要迁移玩家存档。
  const catalog = new Map();
  let state = { quantities: {} };
  let storage = null;
  let readyPromise = null;
  let mutationQueue = Promise.resolve();

  function clampQuantity(value) {
    return Math.max(0, Math.min(9999, Math.floor(Number(value) || 0)));
  }

  function fallbackState() {
    const quantities = {};
    catalog.forEach((item) => {
      const amount = clampQuantity(item.initial_quantity);
      if (amount > 0) quantities[item.id] = amount;
    });
    return { quantities };
  }

  function sanitize(value) {
    const clean = { quantities: {} };
    Object.entries(value?.quantities || {}).forEach(([id, amount]) => {
      if (!catalog.has(id)) return;
      const quantity = clampQuantity(amount);
      if (quantity > 0) clean.quantities[id] = quantity;
    });
    return clean;
  }

  function snapshot() {
    return {
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
      version: 1,
      fallback: fallbackState(),
      migrations: {
        0(value) {
          return value && typeof value === 'object' ? value : fallbackState();
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
    return { quantities: { ...state.quantities } };
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
    getGiftableItems: () => snapshot().items
      .filter((item) => item.quantity > 0 && Number(item.gift_affinity) > 0),
    add,
    remove,
    exportState,
    restore
  };
}(window));
