(function installAffinitySystem(root) {
  'use strict';

  const MAX_AFFINITY = 100;
  const DIALOGUE_LIMIT = 5;
  const GIFT_LIMIT = 1;
  const GIFT_GAIN = 3;
  const initialAffinity = new Map();
  let state = { day: 1, records: {} };
  let readyPromise = null;
  let mutationQueue = Promise.resolve();

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
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
    sanitize(value) {
      const clean = { day: Math.max(1, Math.floor(Number(value?.day) || 1)), records: {} };
      Object.entries(value?.records || {}).slice(0, 50).forEach(([id, record]) => {
        clean.records[id] = {
          affinity: clamp(record?.affinity, -100, MAX_AFFINITY),
          dialogueDay: Math.max(0, Math.floor(Number(record?.dialogueDay) || 0)),
          dialogueGain: clamp(record?.dialogueGain, 0, DIALOGUE_LIMIT),
          giftDay: Math.max(0, Math.floor(Number(record?.giftDay) || 0)),
          gifts: clamp(record?.gifts, 0, GIFT_LIMIT)
        };
      });
      return clean;
    }
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
      record.dialogueGain += 1;
      record.affinity = clamp(record.affinity + 1, -100, MAX_AFFINITY);
      const durable = await persist(false);
      emitChange(id, 1, 'dialogue', durable);
      return { changed: true, durable, snapshot: getSnapshot(id) };
    });
  }

  function giveGift(id) {
    return queueMutation(async () => {
      await (readyPromise || Promise.resolve());
      const record = ensureRecord(id);
      if (record.giftDay !== state.day) {
        record.giftDay = state.day;
        record.gifts = 0;
      }
      if (record.gifts >= GIFT_LIMIT) {
        return { changed: false, reason: 'daily_limit', snapshot: getSnapshot(id) };
      }
      record.giftDay = state.day;
      record.gifts = 1;
      record.affinity = clamp(record.affinity + GIFT_GAIN, -100, MAX_AFFINITY);
      const durable = await persist(true);
      emitChange(id, GIFT_GAIN, 'gift', durable);
      return { changed: true, durable, snapshot: getSnapshot(id) };
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

  root.GameAffinity = {
    initialize,
    ready: () => readyPromise || Promise.resolve(state),
    getDay: () => state.day,
    getSnapshot,
    recordDialogue,
    giveGift,
    advanceDay,
    limits: Object.freeze({
      dialogue: DIALOGUE_LIMIT,
      gifts: GIFT_LIMIT,
      giftGain: GIFT_GAIN
    })
  };
}(window));
