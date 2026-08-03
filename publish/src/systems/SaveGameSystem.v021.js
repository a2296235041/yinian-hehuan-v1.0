(function installSaveGameSystem(root) {
  'use strict';

  const SLOT_IDS = Object.freeze([1, 2, 3]);
  const SAVE_MAX_BYTES = 1536 * 1024;
  const AUXILIARY_KEYS = Object.freeze([
    'affection', 'inventory', 'cultivation', 'player-growth', 'cheat-settings'
  ]);
  const slots = new Map(SLOT_IDS.map((id) => [id, root.GameSaveData.emptySlot()]));
  let initPromise = null;
  let activeSlot = 1;
  let persistencePaused = false;
  function migrationsFor(version) {
    const migrations = {};
    for (let index = 0; index < version; index += 1) {
      migrations[index] = (value) => value || root.GameSaveData.emptySlot();
    }
    return migrations;
  }
  function makeStorage(key, version = 2) {
    return root.GamefyRecipes.createVersionedStorage({
      namespace: 'hehuan:',
      key,
      version,
      fallback: root.GameSaveData.emptySlot(),
      migrations: migrationsFor(version),
      sanitize: root.GameSaveData.sanitizeSlot,
      maxBytes: SAVE_MAX_BYTES
    });
  }
  const storages = new Map(SLOT_IDS.map((id) => [id, makeStorage(`manual-save-${id}`)]));
  const legacyStorage = makeStorage('manual-save', 3);
  const auxiliaryStorages = AUXILIARY_KEYS.map((key) => (
    root.GamefyRecipes.createVersionedStorage({
      namespace: 'hehuan:',
      key,
      version: 1,
      fallback: null,
      migrations: { 0: (value) => value },
      sanitize: (value) => value
    })
  ));
  function validateSlotId(value) {
    const slotId = Math.floor(Number(value));
    if (!SLOT_IDS.includes(slotId)) throw new Error('存档位必须为 1、2 或 3');
    return slotId;
  }

  function statusFor(slotId) {
    const slot = slots.get(slotId) || root.GameSaveData.emptySlot();
    const snapshot = slot.snapshot;
    const realmIndex = snapshot?.cultivation?.realmIndex || 0;
    const levels = root.Game?.Data?.cultivationLevels?.levels || [];
    const itemQuantities = Object.values(snapshot?.inventory?.quantities || {});
    const dialogueCount = Object.values(snapshot?.dialogueHistory?.sessions || {})
      .reduce((total, session) => total + (session?.messages?.length || 0), 0);
    return {
      slotId,
      hasSave: slot.exists === true,
      savedAt: slot.savedAt,
      day: snapshot?.player?.day || 1,
      realmIndex,
      realmName: levels[realmIndex]?.name || '炼气',
      originName: snapshot?.identity?.name || snapshot?.player?.origin?.name || '',
      npcCount: Object.keys(snapshot?.affinity?.records || {}).length,
      dialogueCount,
      itemKinds: itemQuantities.filter((quantity) => Number(quantity) > 0).length
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
    await Promise.all([
      root.Game.systemsReady || root.GamePlayerState.ready(),
      root.GameTournament.initialize()
    ]);
    const growth = root.GamePlayerGrowth.exportState();
    const stats = root.GamePlayerStats.getSnapshot();
    const effective = {};
    root.GameSaveData.attributeKeys.forEach((key) => {
      effective[key] = stats[key];
    });
    return root.GameSaveData.sanitizeSnapshot({
      identity: root.Game.player.origin,
      attributes: {
        base: root.Game.player.origin?.attributes,
        bonuses: growth.bonuses,
        effective
      },
      player: root.Game.player,
      affinity: root.GameAffinity.exportState(),
      cultivation: root.GameCultivation.exportState(),
      inventory: root.GameInventory.exportState(),
      growth,
      dialogueHistory: root.GameAI.exportSessions(),
      tournament: root.GameTournament.exportState(),
      location: currentLocation()
    });
  }

  async function saveCurrent(requestedSlot = 1) {
    if (persistencePaused) throw new Error('存档清理中，暂时无法保存');
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

  async function clearAllOwnedData() {
    persistencePaused = true;
    try {
      await root.GameAutoSave?.clear?.();
      const allStorages = [...storages.values(), legacyStorage, ...auxiliaryStorages];
      await Promise.all(allStorages.map((storage) => storage.clear()));
      await root.GameTournament?.clear?.();
      SLOT_IDS.forEach((slotId) => slots.set(slotId, root.GameSaveData.emptySlot()));
      root.GameCheat?.resetLocal?.();
      initPromise = null;
      return true;
    } catch (error) {
      persistencePaused = false;
      throw error;
    }
  }

  root.GameSave = {
    initialize,
    saveCurrent,
    captureSnapshot: capture,
    loadSlot,
    loadCurrent,
    clearAllOwnedData,
    getStatuses: async () => { await initialize(); return getStatusesSync(); },
    getStatus: async (slotId = 1) => { await initialize(); return statusFor(validateSlotId(slotId)); },
    getActiveSlot: () => activeSlot,
    isPersistencePaused: () => persistencePaused
  };
}(window));
