(function installSaveGameSystem(root) {
  'use strict';

  const EMPTY_SLOT = Object.freeze({ exists: false, savedAt: null, snapshot: null });
  let slot = { ...EMPTY_SLOT };
  let initPromise = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  // 手动存档会再次清洗好感记录，防止旧版本或损坏数据突破每日交互上限。
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
    const allowed = ['strength', 'constitution', 'agility', 'intelligence', 'wisdom', 'luck'];
    allowed.forEach((key) => {
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
        progress: clamp(value?.cultivation?.progress, 0, 100000000)
      },
      inventory: sanitizeInventory(value?.inventory),
      growth: sanitizeGrowth(value?.growth),
      location: { buildingId }
    };
  }

  // 空槽也使用明确结构保存，开始页可区分“暂无存档”和“存档读取失败”。
  function sanitizeSlot(value) {
    if (value?.exists !== true || !isRecord(value.snapshot)) return { ...EMPTY_SLOT };
    const timestamp = Date.parse(value.savedAt);
    if (!Number.isFinite(timestamp)) return { ...EMPTY_SLOT };
    const snapshot = sanitizeSnapshot(value.snapshot);
    if (!snapshot.player.origin) return { ...EMPTY_SLOT };
    return { exists: true, savedAt: new Date(timestamp).toISOString(), snapshot };
  }

  const storage = root.GamefyRecipes.createVersionedStorage({
    namespace: 'hehuan:',
    key: 'manual-save',
    version: 3,
    fallback: EMPTY_SLOT,
    migrations: {
      0: (value) => value || EMPTY_SLOT,
      1: (value) => value || EMPTY_SLOT,
      2: (value) => value || EMPTY_SLOT
    },
    sanitize: sanitizeSlot
  });

  function initialize() {
    if (initPromise) return initPromise;
    initPromise = storage.load()
      .then((saved) => { slot = saved; return slot; })
      .catch((error) => {
        initPromise = null;
        console.error('手动存档读取失败:', error.code || '', error.message, error.stack);
        throw error;
      });
    return initPromise;
  }

  function currentLocation() {
    try {
      const scene = root.game?.scene?.getScene('GameScene');
      return { buildingId: scene?.currentBuilding?.id || null };
    } catch (_) {
      return { buildingId: null };
    }
  }

  async function capture() {
    // 等待所有成长系统完成初始化，确保一次快照来自同一个可交互时间点。
    await (root.Game.systemsReady || root.GamePlayerState.ready());
    return sanitizeSnapshot({
      player: root.Game.player,
      affinity: root.GameAffinity.exportState(),
      cultivation: root.GameCultivation.exportState(),
      inventory: root.GameInventory.exportState(),
      growth: root.GamePlayerGrowth.exportState(),
      location: currentLocation()
    });
  }

  async function saveCurrent() {
    if (!root.Game.player?.origin) throw new Error('当前没有可保存的游戏进度');
    await initialize();
    const next = { exists: true, savedAt: new Date().toISOString(), snapshot: await capture() };
    const result = await storage.save(next, { flush: true });
    if (result.remote !== true) throw new Error('存档未能同步到平台，请稍后重试');
    slot = result.value;
    root.Game.EventBus.emit('manual-save-changed', getStatusSync());
    return slot;
  }

  // 开始页只读取快照，不提前创建 Phaser 游戏场景或修改当前内存状态。
  async function loadSlot() {
    await initialize();
    if (!slot.exists || !slot.snapshot) throw new Error('当前没有可读取的存档');
    return sanitizeSnapshot(slot.snapshot);
  }

  async function loadCurrent() {
    // 游戏内读档由玩家状态系统统一下发，避免背包、修为和好感只恢复一部分。
    const snapshot = await loadSlot();
    await root.GamePlayerState.restore(snapshot);
    root.Game.EventBus.emit('manual-save-loaded', { snapshot });
    return snapshot;
  }

  function getStatusSync() {
    const cultivation = slot.snapshot?.cultivation;
    return {
      hasSave: slot.exists === true,
      savedAt: slot.savedAt,
      day: slot.snapshot?.player?.day || 1,
      realmIndex: cultivation?.realmIndex || 0
    };
  }

  root.GameSave = {
    initialize,
    saveCurrent,
    loadSlot,
    loadCurrent,
    getStatus: async () => { await initialize(); return getStatusSync(); }
  };
}(window));
