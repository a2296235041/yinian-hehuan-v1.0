(function installSaveGameSystem(root) {
  'use strict';

  const SLOT_IDS = Object.freeze([1, 2, 3]);
  const slots = new Map(SLOT_IDS.map((id) => [id, root.GameSaveData.emptySlot()]));
  let initPromise = null;
  let activeSlot = 1;

  function makeStorage(key, version = 1) {
    return root.GamefyRecipes.createVersionedStorage({
      namespace: 'hehuan:',
      key,
      version,
      fallback: root.GameSaveData.emptySlot(),
      migrations: version === 1
        ? { 0: (value) => value || root.GameSaveData.emptySlot() }
        : {
            0: (value) => value || root.GameSaveData.emptySlot(),
            1: (value) => value || root.GameSaveData.emptySlot(),
            2: (value) => value || root.GameSaveData.emptySlot()
          },
      sanitize: root.GameSaveData.sanitizeSlot
    });
  }

  const storages = new Map(SLOT_IDS.map((id) => [id, makeStorage(`manual-save-${id}`)]));
  const legacyStorage = makeStorage('manual-save', 3);

  function validateSlotId(value) {
    const slotId = Math.floor(Number(value));
    if (!SLOT_IDS.includes(slotId)) throw new Error('存档位必须为 1、2 或 3');
    return slotId;
  }

  function statusFor(slotId) {
    const slot = slots.get(slotId) || root.GameSaveData.emptySlot();
    return {
      slotId,
      hasSave: slot.exists === true,
      savedAt: slot.savedAt,
      day: slot.snapshot?.player?.day || 1,
      realmIndex: slot.snapshot?.cultivation?.realmIndex || 0,
      originName: slot.snapshot?.player?.origin?.name || ''
    };
  }

  function getStatusesSync() {
    return SLOT_IDS.map(statusFor);
  }

  async function migrateLegacy(legacy) {
    if (slots.get(1)?.exists || !legacy?.exists) return;
    slots.set(1, legacy);
    try {
      await storages.get(1).save(legacy, { flush: true });
    } catch (error) {
      console.error('旧存档迁移失败:', error.code || '', error.message, error.stack);
    }
  }

  function initialize() {
    if (initPromise) return initPromise;
    initPromise = Promise.all([
      Promise.all(SLOT_IDS.map(async (slotId) => {
        slots.set(slotId, await storages.get(slotId).load());
      })),
      legacyStorage.load()
    ]).then(async ([, legacy]) => {
      await migrateLegacy(legacy);
      return getStatusesSync();
    }).catch((error) => {
      initPromise = null;
      console.error('多存档读取失败:', error.code || '', error.message, error.stack);
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
    await (root.Game.systemsReady || root.GamePlayerState.ready());
    return root.GameSaveData.sanitizeSnapshot({
      player: root.Game.player,
      affinity: root.GameAffinity.exportState(),
      cultivation: root.GameCultivation.exportState(),
      inventory: root.GameInventory.exportState(),
      growth: root.GamePlayerGrowth.exportState(),
      location: currentLocation()
    });
  }

  async function saveCurrent(requestedSlot = 1) {
    if (!root.Game.player?.origin) throw new Error('当前没有可保存的游戏进度');
    const slotId = validateSlotId(requestedSlot);
    await initialize();
    const next = { exists: true, savedAt: new Date().toISOString(), snapshot: await capture() };
    const result = await storages.get(slotId).save(next, { flush: true });
    if (result.remote !== true) throw new Error('存档未能同步到平台，请稍后重试');
    slots.set(slotId, result.value);
    activeSlot = slotId;
    root.Game.EventBus.emit('manual-save-changed', statusFor(slotId));
    return result.value;
  }

  async function loadSlot(requestedSlot = 1) {
    const slotId = validateSlotId(requestedSlot);
    await initialize();
    const slot = slots.get(slotId);
    if (!slot?.exists || !slot.snapshot) throw new Error(`存档 ${slotId} 为空`);
    activeSlot = slotId;
    return root.GameSaveData.sanitizeSnapshot(slot.snapshot);
  }

  async function loadCurrent(requestedSlot = 1) {
    const snapshot = await loadSlot(requestedSlot);
    await root.GamePlayerState.restore(snapshot);
    root.Game.EventBus.emit('manual-save-loaded', { slotId: activeSlot, snapshot });
    return snapshot;
  }

  root.GameSave = {
    initialize,
    saveCurrent,
    loadSlot,
    loadCurrent,
    getStatuses: async () => { await initialize(); return getStatusesSync(); },
    getStatus: async (slotId = 1) => { await initialize(); return statusFor(validateSlotId(slotId)); },
    getActiveSlot: () => activeSlot
  };
}(window));
