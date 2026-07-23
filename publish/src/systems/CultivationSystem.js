(function installCultivationSystem(root) {
  'use strict';

  const levels = [];
  let state = { realmIndex: 0, progress: 10 };
  let storage = null;
  let readyPromise = null;
  let mutationQueue = Promise.resolve();

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
  }

  function requiredAt(index) {
    const value = Number(levels[index]?.exp_needed);
    return value > 0 ? Math.floor(value) : 0;
  }

  // 境界越高，玩家每天需要投入的修炼次数越多。
  // 该数值只负责每日次数上限，真正的修为增幅由 UIScene 的修炼动作计算。
  function dailyCultivationLimit(index = state.realmIndex) {
    return Math.max(5, 5 + Math.floor(Number(index) || 0) * 2);
  }

  function sanitize(value) {
    const realmIndex = clamp(value?.realmIndex, 0, Math.max(0, levels.length - 1));
    return {
      realmIndex,
      progress: clamp(value?.progress, 0, requiredAt(realmIndex) || 0)
    };
  }

  function snapshot() {
    const realm = levels[state.realmIndex] || { name: '炼气', exp_needed: 100 };
    const required = requiredAt(state.realmIndex);
    const maxRealm = state.realmIndex >= levels.length - 1 || required <= 0;
    const percent = required > 0 ? Math.min(100, Math.floor(state.progress / required * 100)) : 100;
    let phaseName = percent < 34 ? '初期' : (percent < 67 ? '中期' : '后期');
    if (percent >= 100) phaseName = '圆满';
    const affinityDiscount = root.Game.player?.origin?.talent?.id === 'hehuan_descendant' ? 5 : 0;
    return {
      realmIndex: state.realmIndex,
      realmName: realm.name,
      phaseName,
      label: `${realm.name}·${phaseName}`,
      progress: state.progress,
      required,
      percent,
      maxRealm,
      canBreakthrough: !maxRealm && required > 0 && state.progress >= required,
      nextRealmName: levels[state.realmIndex + 1]?.name || null,
      requiredAffinity: Math.max(15, Math.min(80, 20 + state.realmIndex * 5 - affinityDiscount))
    };
  }

  async function persist(flush) {
    try {
      const result = await storage.save(state, { flush });
      return result.remote === true;
    } catch (error) {
      console.error('修为进度保存失败:', error.code || '', error.message, error.stack);
      return false;
    }
  }

  function queueMutation(action) {
    const task = mutationQueue.then(action, action);
    mutationQueue = task.then(() => undefined, () => undefined);
    return task;
  }

  function emitChange(delta, source, durable) {
    root.Game.EventBus.emit('cultivation-changed', {
      ...snapshot(),
      delta,
      source,
      durable
    });
  }

  function initialize(config) {
    if (readyPromise) return readyPromise;
    (config?.levels || []).forEach((level) => levels.push({ ...level }));
    storage = root.GamefyRecipes.createVersionedStorage({
      namespace: 'hehuan:',
      key: 'cultivation',
      version: 1,
      fallback: state,
      migrations: { 0: (value) => value || state },
      sanitize
    });
    readyPromise = storage.load()
      .then((saved) => { state = saved; })
      .catch((error) => {
        console.error('修为进度读取失败:', error.code || '', error.message, error.stack);
      })
      .then(() => {
        emitChange(0, 'load', true);
        return snapshot();
      });
    return readyPromise;
  }

  function addCultivation(amount, source = 'cultivate') {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      const before = snapshot();
      if (before.maxRealm) return { changed: false, reason: 'max_realm', snapshot: before };
      if (before.canBreakthrough) return { changed: false, reason: 'bottleneck', snapshot: before };
      const gain = clamp(amount, 1, 100000000);
      const next = Math.min(before.required, state.progress + gain);
      const applied = next - state.progress;
      state.progress = next;
      const durable = await persist(false);
      emitChange(applied, source, durable);
      return { changed: applied > 0, gain: applied, durable, snapshot: snapshot() };
    });
  }

  // 百分比丹药以“当前境界所需总修为”为基准，不受跨境界影响。
  function addCultivationPercent(percent, source = 'item') {
    const snapshotBefore = snapshot();
    if (snapshotBefore.maxRealm || snapshotBefore.canBreakthrough) {
      return Promise.resolve({
        changed: false,
        reason: snapshotBefore.maxRealm ? 'max_realm' : 'bottleneck',
        snapshot: snapshotBefore
      });
    }
    const safePercent = Math.max(1, Math.min(100, Number(percent) || 0));
    const amount = Math.max(1, Math.ceil(snapshotBefore.required * safePercent / 100));
    return addCultivation(amount, source);
  }

  function syncPlayerDailyLimit(player = root.Game.player) {
    if (!player) return;
    player.maxDailyCultivation = dailyCultivationLimit(state.realmIndex);
    player.dailyCultivationCount = Math.min(
      Math.max(0, Math.floor(Number(player.dailyCultivationCount) || 0)),
      player.maxDailyCultivation
    );
  }

  function breakthrough(npcId, affinity) {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      const before = snapshot();
      if (!before.canBreakthrough) return { changed: false, reason: 'not_ready', snapshot: before };
      if (Number(affinity) < before.requiredAffinity) {
        return { changed: false, reason: 'affinity_low', snapshot: before };
      }
      state.realmIndex += 1;
      state.progress = 0;
      syncPlayerDailyLimit();
      const durable = await persist(true);
      const next = snapshot();
      root.Game.EventBus.emit('realm-breakthrough', { ...next, npcId, durable });
      emitChange(0, 'breakthrough', durable);
      return { changed: true, durable, snapshot: next };
    });
  }

  function exportState() {
    return { realmIndex: state.realmIndex, progress: state.progress };
  }

  function restore(nextState) {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      state = sanitize(nextState);
      syncPlayerDailyLimit();
      const durable = await persist(true);
      emitChange(0, 'load', durable);
      return { durable, snapshot: snapshot() };
    });
  }

  root.GameCultivation = {
    initialize,
    ready: () => readyPromise || Promise.resolve(snapshot()),
    getSnapshot: snapshot,
    getRealmName: (index) => levels[index]?.name || '未知境界',
    getDailyCultivationLimit: dailyCultivationLimit,
    addCultivation,
    addCultivationPercent,
    syncPlayerDailyLimit,
    breakthrough,
    exportState,
    restore
  };
}(window));
