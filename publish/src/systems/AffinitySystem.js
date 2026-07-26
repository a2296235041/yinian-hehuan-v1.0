(function installAffinitySystem(root) {
  'use strict';

  const MAX_AFFINITY = 100;
  const DIALOGUE_LIMIT = 5;
  const GIFT_LIMIT = 1;
  const DEFAULT_GIFT_GAIN = 3;
  const initialAffinity = new Map();
  let state = { day: 1, records: {} };
  let readyPromise = null;
  let mutationQueue = Promise.resolve();
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }
  function sanitizeState(value) {
    return root.GameAffinityState.sanitize(value, {
      maxAffinity: MAX_AFFINITY,
      dialogueLimit: DIALOGUE_LIMIT,
      giftLimit: GIFT_LIMIT
    });
  }
  const storage = root.GamefyRecipes.createVersionedStorage({
    namespace: 'hehuan:',
    key: 'affection',
    version: 1,
    fallback: { day: 1, records: {} },
    migrations: {
      0(value) {
        return value && typeof value === 'object' ? value : { day: 1, records: {} };
      }
    },
    sanitize: sanitizeState
  });
  function ensureRecord(id) {
    if (!state.records[id]) {
      state.records[id] = {
        affinity: initialAffinity.get(id) || 0,
        dialogueDay: 0,
        dialogueGain: 0,
        giftDay: 0,
        gifts: 0
      };
    }
    return state.records[id];
  }
  function relationship(affinity) {
    if (affinity < 0) return '戒备';
    if (affinity < 20) return '初识';
    if (affinity < 40) return '熟悉';
    if (affinity < 65) return '亲近';
    if (affinity < 85) return '信赖';
    return '倾心';
  }
  function getSnapshot(id) {
    const record = ensureRecord(id);
    const dialogueGain = record.dialogueDay === state.day ? record.dialogueGain : 0;
    const gifts = record.giftDay === state.day ? record.gifts : 0;
    return {
      npcId: id,
      day: state.day,
      affinity: record.affinity,
      relationship: relationship(record.affinity),
      dialogueGain,
      dialogueRemaining: DIALOGUE_LIMIT - dialogueGain,
      gifts,
      canGift: gifts < GIFT_LIMIT
    };
  }
  async function persist(flush) {
    try {
      const result = await storage.save(state, { flush });
      return result.remote === true;
    } catch (error) {
      console.error('好感度保存失败:', error.code || '', error.message, error.stack);
      return false;
    }
  }
  function emitChange(id, delta, source, durable) {
    root.Game.EventBus.emit('affinity-changed', {
      ...getSnapshot(id),
      delta,
      source,
      durable
    });
  }
  function queueMutation(action) {
    const task = mutationQueue.then(action, action);
    mutationQueue = task.then(() => undefined, () => undefined);
    return task;
  }
  function initialize(npcs) {
    (npcs || []).forEach((npc) => {
      initialAffinity.set(npc.id, clamp(npc.initial_affinity, -100, MAX_AFFINITY));
    });
    if (readyPromise) return readyPromise;
    readyPromise = storage.load()
      .then((saved) => { state = saved; })
      .catch((error) => {
        console.error('好感度读取失败:', error.code || '', error.message, error.stack);
      })
      .then(() => {
        initialAffinity.forEach((_, id) => ensureRecord(id));
        return state;
    });
    return readyPromise;
  }
  function recordDialogue(id) {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      const record = ensureRecord(id);
      if (record.dialogueDay !== state.day) {
        record.dialogueDay = state.day;
        record.dialogueGain = 0;
      }
      if (record.dialogueGain >= DIALOGUE_LIMIT) {
        return { changed: false, reason: 'daily_limit', snapshot: getSnapshot(id) };
      }
      const talentBonus = root.Game.player?.origin?.talent?.id === 'hehuan_descendant' ? 1 : 0;
      const appliedGain = Math.min(1 + talentBonus, DIALOGUE_LIMIT - record.dialogueGain);
      record.dialogueGain += appliedGain;
      record.affinity = clamp(record.affinity + appliedGain, -100, MAX_AFFINITY);
      const durable = await persist(false);
      emitChange(id, appliedGain, 'dialogue', durable);
      return { changed: true, gain: appliedGain, durable, snapshot: getSnapshot(id) };
    });
  }
  // 礼物的好感收益由物品配置决定，但每天一次的限制仍由本系统统一校验。
  function giveGift(id, gain = DEFAULT_GIFT_GAIN) {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      const record = ensureRecord(id);
      const talentBonus = root.Game.player?.origin?.talent?.id === 'hehuan_descendant' ? 2 : 0;
      const affinityGain = clamp(Number(gain) + talentBonus, 1, 10);
      if (record.giftDay !== state.day) {
        record.giftDay = state.day;
        record.gifts = 0;
      }
      if (record.gifts >= GIFT_LIMIT) {
        return { changed: false, reason: 'daily_limit', snapshot: getSnapshot(id) };
      }
      record.giftDay = state.day;
      record.gifts = 1;
      record.affinity = clamp(record.affinity + affinityGain, -100, MAX_AFFINITY);
      const durable = await persist(true);
      emitChange(id, affinityGain, 'gift', durable);
      return { changed: true, gain: affinityGain, durable, snapshot: getSnapshot(id) };
    });
  }
  // 探险偶遇属于额外奖励，不占用每天 5 次交谈或 1 次赠礼额度。
  function addBonus(id, gain, source = 'exploration') {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      const affinityGain = clamp(gain, 1, 10);
      const record = ensureRecord(id);
      record.affinity = clamp(record.affinity + affinityGain, -100, MAX_AFFINITY);
      const durable = await persist(false);
      emitChange(id, affinityGain, source, durable);
      return { changed: true, gain: affinityGain, durable, snapshot: getSnapshot(id) };
    });
  }
  function advanceDay() {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      state.day += 1;
      const durable = await persist(true);
      root.Game.EventBus.emit('game-day-changed', { day: state.day, durable });
      return { day: state.day, durable };
    });
  }
  function exportState() {
    return root.GameAffinityState.clone(state);
  }
  function restore(nextState) {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      state = sanitizeState(nextState);
      initialAffinity.forEach((_, id) => ensureRecord(id));
      const durable = await persist(true);
      root.Game.EventBus.emit('game-day-changed', { day: state.day, durable });
      initialAffinity.forEach((_, id) => emitChange(id, 0, 'load', durable));
      return { durable, state: exportState() };
    });
  }
  root.GameAffinity = {
    initialize,
    ready: () => readyPromise || Promise.resolve(state),
    getDay: () => state.day,
    getSnapshot,
    recordDialogue,
    giveGift,
    addBonus,
    advanceDay,
    exportState,
    restore,
    limits: Object.freeze({
      dialogue: DIALOGUE_LIMIT,
      gifts: GIFT_LIMIT,
      giftGain: DEFAULT_GIFT_GAIN
    })
  };
}(window));
