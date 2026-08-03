(function installAutoSaveSystem(root) {
  'use strict';

  const EMPTY_SLOT = () => root.GameSaveData.emptySlot();
  const SAVE_MAX_BYTES = 1536 * 1024;
  const storage = root.GamefyRecipes.createVersionedStorage({
    namespace: 'hehuan:',
    key: 'auto-save',
    version: 1,
    fallback: EMPTY_SLOT(),
    migrations: { 0: (value) => value || EMPTY_SLOT() },
    sanitize: root.GameSaveData.sanitizeSlot,
    maxBytes: SAVE_MAX_BYTES
  });
  let slot = EMPTY_SLOT();
  let initPromise = null;
  let initialized = false;
  let dialogueProgress = 0;
  let saveQueue = Promise.resolve();

  function statusFor() {
    const snapshot = slot.snapshot;
    const realmIndex = snapshot?.cultivation?.realmIndex || 0;
    const levels = root.Game?.Data?.cultivationLevels?.levels || [];
    const itemQuantities = Object.values(snapshot?.inventory?.quantities || {});
    const dialogueCount = Object.values(snapshot?.dialogueHistory?.sessions || {})
      .reduce((total, session) => total + (session?.messages?.length || 0), 0);
    return {
      slotId: 'auto',
      label: '自动存档',
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

  function initialize() {
    if (initPromise) return initPromise;
    initPromise = storage.load().then((saved) => {
      slot = saved;
      return statusFor();
    }).catch((error) => {
      initPromise = null;
      console.error('自动存档读取失败:', error.code || '', error.message, error.stack);
      throw error;
    });
    return initPromise;
  }

  async function save(reason) {
    if (root.GameSave.isPersistencePaused() || !root.Game.player?.origin) return null;
    await initialize();
    const next = {
      exists: true,
      savedAt: new Date().toISOString(),
      snapshot: await root.GameSave.captureSnapshot()
    };
    const result = await storage.save(next, { flush: true });
    if (result.remote !== true) throw new Error('自动存档未能同步到平台');
    slot = result.value;
    const status = statusFor();
    root.Game.EventBus.emit('autosave-changed', { ...status, reason });
    return result.value;
  }

  function queueSave(reason) {
    const task = saveQueue.then(() => save(reason), () => save(reason));
    saveQueue = task.then(() => undefined, () => undefined);
    task.catch((error) => {
      console.error('自动存档失败:', error.code || '', error.message, error.stack);
      root.Game.EventBus.emit('autosave-failed', { reason, message: error.message });
    });
    return task;
  }

  function handleDialogueComplete() {
    dialogueProgress += 1;
    if (dialogueProgress < 3) return;
    dialogueProgress -= 3;
    void queueSave('dialogue');
  }

  function handleDayAdvanced() {
    void queueSave('day');
  }

  function init() {
    if (!initialized) {
      initialized = true;
      root.Game.EventBus.on('npc-dialogue-completed', handleDialogueComplete);
      root.Game.EventBus.on('game-day-advanced', handleDayAdvanced);
    }
    return initialize();
  }

  async function loadSlot() {
    await initialize();
    if (!slot?.exists || !slot.snapshot) throw new Error('自动存档为空');
    return root.GameSaveData.sanitizeSnapshot(slot.snapshot);
  }

  async function loadCurrent() {
    const snapshot = await loadSlot();
    await root.GamePlayerState.restore(snapshot);
    root.Game.EventBus.emit('autosave-loaded', { snapshot });
    return snapshot;
  }

  async function clear() {
    await storage.clear();
    slot = EMPTY_SLOT();
    dialogueProgress = 0;
    initPromise = null;
    return true;
  }

  root.GameAutoSave = Object.freeze({
    init,
    loadSlot,
    loadCurrent,
    clear,
    getStatus: async () => { await initialize(); return statusFor(); }
  });
}(window));
