(function installSaveData(root) {
  'use strict';

  const EMPTY_SLOT = Object.freeze({ exists: false, savedAt: null, snapshot: null });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function sanitizeAffinity(value) {
    const clean = { day: clamp(value?.day, 1, 999999), records: {} };
    Object.entries(value?.records || {}).slice(0, 50).forEach(([id, record]) => {
      if (!/^[a-z0-9_-]{1,64}$/i.test(id)) return;
      clean.records[id] = {
        affinity: clamp(record?.affinity, -100, 100),
        dialogueDay: clamp(record?.dialogueDay, 0, clean.day),
        dialogueGain: clamp(record?.dialogueGain, 0, 5),
        giftDay: clamp(record?.giftDay, 0, clean.day),
        gifts: clamp(record?.gifts, 0, 1)
      };
    });
    return clean;
  }

  function sanitizeInventory(value) {
    const quantities = {};
    const savedStones = Number(value?.spiritStones);
    Object.entries(value?.quantities || {}).slice(0, 200).forEach(([id, amount]) => {
      if (/^[a-z0-9_-]{1,64}$/i.test(id)) quantities[id] = clamp(amount, 0, 9999);
    });
    return {
      quantities,
      spiritStones: Number.isFinite(savedStones) ? clamp(savedStones, 0, 9999) : 100
    };
  }

  function sanitizeGrowth(value) {
    const bonuses = {};
    ['strength', 'constitution', 'agility', 'intelligence', 'wisdom', 'luck']
      .forEach((key) => {
        const amount = clamp(value?.bonuses?.[key], 0, 999);
        if (amount > 0) bonuses[key] = amount;
      });
    return { bonuses };
  }

  function sanitizePlayer(value, day) {
    const origin = isRecord(value?.origin) && typeof value.origin.id === 'string'
      ? JSON.parse(JSON.stringify(value.origin))
      : null;
    const maxStamina = clamp(Number(value?.maxStamina) || 12, 1, 999);
    const maxDailyCultivation = clamp(Number(value?.maxDailyCultivation) || 5, 1, 99);
    return {
      origin,
      maxStamina,
      stamina: clamp(value?.stamina, 0, maxStamina),
      day,
      maxDailyCultivation,
      dailyCultivationCount: clamp(value?.dailyCultivationCount, 0, maxDailyCultivation)
    };
  }

  function sanitizeSnapshot(value) {
    const affinity = sanitizeAffinity(value?.affinity);
    const buildingId = typeof value?.location?.buildingId === 'string'
      ? value.location.buildingId
      : null;
    return {
      player: sanitizePlayer(value?.player, affinity.day),
      affinity,
      cultivation: {
        realmIndex: clamp(value?.cultivation?.realmIndex, 0, 100),
        progress: clamp(value?.cultivation?.progress, 0, Number.MAX_SAFE_INTEGER)
      },
      inventory: sanitizeInventory(value?.inventory),
      growth: sanitizeGrowth(value?.growth),
      location: { buildingId }
    };
  }

  function sanitizeSlot(value) {
    if (value?.exists !== true || !isRecord(value.snapshot)) return { ...EMPTY_SLOT };
    const timestamp = Date.parse(value.savedAt);
    if (!Number.isFinite(timestamp)) return { ...EMPTY_SLOT };
    const snapshot = sanitizeSnapshot(value.snapshot);
    if (!snapshot.player.origin) return { ...EMPTY_SLOT };
    return { exists: true, savedAt: new Date(timestamp).toISOString(), snapshot };
  }

  function createFreshSnapshot(origin, items) {
    const quantities = {};
    (items || []).forEach((item) => {
      const amount = clamp(item?.initial_quantity, 0, 9999);
      if (item?.id && amount > 0) quantities[item.id] = amount;
    });
    return sanitizeSnapshot({
      player: {
        origin, maxStamina: 12, stamina: 12, day: 1,
        maxDailyCultivation: 5, dailyCultivationCount: 5
      },
      affinity: { day: 1, records: {} },
      cultivation: { realmIndex: 0, progress: 10 },
      inventory: { quantities, spiritStones: 100 },
      growth: { bonuses: {} },
      location: { buildingId: null }
    });
  }

  root.GameSaveData = Object.freeze({
    emptySlot: () => ({ ...EMPTY_SLOT }),
    sanitizeSlot,
    sanitizeSnapshot,
    createFreshSnapshot
  });
}(window));
