(function installSaveData(root) {
  'use strict';

  const EMPTY_SLOT = Object.freeze({ exists: false, savedAt: null, snapshot: null });
  const ATTRIBUTE_KEYS = Object.freeze([
    'strength', 'constitution', 'agility', 'intelligence', 'charisma', 'wisdom', 'luck'
  ]);

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function cleanText(value, fallback = '', maxLength = 500) {
    return typeof value === 'string' ? value.slice(0, maxLength) : fallback;
  }

  function sanitizeIdentity(value) {
    if (!isRecord(value) || !/^[a-z0-9_-]{1,64}$/i.test(value.id || '')) return null;
    const talent = isRecord(value.talent) ? value.talent : {};
    return {
      id: value.id,
      name: cleanText(value.name, '无名弟子', 80),
      description: cleanText(value.description, '', 1000),
      gender: value.gender === 'female' ? 'female' : 'male',
      talent: {
        id: cleanText(talent.id, '', 64),
        name: cleanText(talent.name, '未觉醒天赋', 80),
        description: cleanText(talent.description, '', 1000)
      }
    };
  }

  function sanitizeAttributeMap(value) {
    const clean = {};
    ATTRIBUTE_KEYS.forEach((key) => {
      clean[key] = clamp(value?.[key], 0, 9999);
    });
    return clean;
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
    ATTRIBUTE_KEYS.forEach((key) => {
      const amount = clamp(value?.bonuses?.[key], 0, 9999);
      if (amount > 0) bonuses[key] = amount;
    });
    return { bonuses };
  }

  function sanitizeAttributes(value, origin, growth) {
    const base = sanitizeAttributeMap(value?.base || origin?.attributes);
    const bonuses = sanitizeAttributeMap(value?.bonuses || growth?.bonuses);
    const talentId = origin?.talent?.id || origin?.id || '';
    ATTRIBUTE_KEYS.forEach((key) => {
      const talentBonus = talentId === 'mindful_guest'
        && ['intelligence', 'charisma'].includes(key) ? 8 : 0;
      bonuses[key] = clamp(bonuses[key], 0, Math.max(0, 9999 - base[key] - talentBonus));
    });
    const savedEffective = isRecord(value?.effective) ? value.effective : {};
    const effective = {};
    ATTRIBUTE_KEYS.forEach((key) => {
      effective[key] = Object.prototype.hasOwnProperty.call(savedEffective, key)
        ? clamp(savedEffective[key], 0, 9999)
        : clamp(base[key] + bonuses[key], 0, 9999);
    });
    return { base, bonuses, effective };
  }

  function sanitizePlayer(value, day, origin) {
    const maxStamina = clamp(Number(value?.maxStamina) || 12, 1, 999);
    const maxDailyCultivation = clamp(Number(value?.maxDailyCultivation) || 5, 1, 99);
    return {
      origin,
      maxStamina,
      stamina: clamp(value?.stamina, 0, maxStamina),
      day,
      periodIndex: clamp(value?.periodIndex, 0, 3),
      maxDailyCultivation,
      dailyCultivationCount: clamp(value?.dailyCultivationCount, 0, maxDailyCultivation)
    };
  }

  function sanitizeSnapshot(value) {
    const affinity = sanitizeAffinity(value?.affinity);
    const sourceOrigin = value?.player?.origin;
    const identity = sanitizeIdentity(value?.identity || sourceOrigin);
    const growth = sanitizeGrowth(value?.growth || { bonuses: value?.attributes?.bonuses });
    const attributes = sanitizeAttributes(value?.attributes, sourceOrigin, growth);
    const origin = identity ? { ...identity, attributes: attributes.base } : null;
    const buildingId = typeof value?.location?.buildingId === 'string'
      ? value.location.buildingId
      : null;
    return {
      identity,
      attributes,
      player: sanitizePlayer(value?.player, affinity.day, origin),
      affinity,
      cultivation: {
        realmIndex: clamp(value?.cultivation?.realmIndex, 0, 100),
        progress: clamp(value?.cultivation?.progress, 0, Number.MAX_SAFE_INTEGER)
      },
      inventory: sanitizeInventory(value?.inventory),
      growth: { bonuses: { ...attributes.bonuses } },
      dialogueHistory: root.GameDialogueHistory.sanitize(value?.dialogueHistory),
      tournament: root.GameTournamentState.sanitize(value?.tournament),
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
        origin, maxStamina: 12, stamina: 12, day: 1, periodIndex: 0,
        maxDailyCultivation: 5, dailyCultivationCount: 5
      },
      affinity: { day: 1, records: {} },
      cultivation: { realmIndex: 0, progress: 10 },
      inventory: { quantities, spiritStones: 100 },
      growth: { bonuses: {} },
      dialogueHistory: { sessions: {} },
      tournament: root.GameTournamentState.fresh(),
      location: { buildingId: null }
    });
  }

  root.GameSaveData = Object.freeze({
    attributeKeys: ATTRIBUTE_KEYS,
    emptySlot: () => ({ ...EMPTY_SLOT }),
    sanitizeSlot,
    sanitizeSnapshot,
    createFreshSnapshot
  });
}(window));
