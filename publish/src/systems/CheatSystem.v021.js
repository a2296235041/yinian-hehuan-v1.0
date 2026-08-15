(function installCheatSystem(root) {
  'use strict';

  const DEFAULT_STATE = Object.freeze({ unlimitedStamina: false });
  const PHASE_RATIOS = Object.freeze({ early: 0.1, middle: 0.5, late: 0.8, complete: 1 });
  let state = { ...DEFAULT_STATE };
  let readyPromise = null;
  let listenersInstalled = false;
  let refilling = false;
  const persistence = root.GamePersistenceStatus;

  const storage = root.GamefyRecipes.createVersionedStorage({
    namespace: 'hehuan:',
    key: 'cheat-settings',
    version: 1,
    fallback: DEFAULT_STATE,
    migrations: { 0: (value) => value || DEFAULT_STATE },
    sanitize: (value) => ({ unlimitedStamina: value?.unlimitedStamina === true })
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
  }

  function snapshot() {
    return { ...state };
  }

  function refillUnlimited() {
    const player = root.Game?.player;
    if (!state.unlimitedStamina || !player || refilling) return false;
    const stamina = Math.max(1, Number(player.maxStamina) || 12);
    const cultivation = Math.max(1, Number(player.maxDailyCultivation) || 5);
    if (player.stamina === stamina && player.dailyCultivationCount === cultivation) return false;
    refilling = true;
    player.stamina = stamina;
    player.dailyCultivationCount = cultivation;
    root.Game.EventBus.emit('player-state-changed', { player: { ...player } });
    refilling = false;
    return true;
  }

  function installListeners() {
    if (listenersInstalled) return;
    listenersInstalled = true;
    [
      'player-state-ready',
      'player-state-changed',
      'cultivation-changed',
      'time-period-changed'
    ].forEach((eventName) => root.Game.EventBus.on(eventName, refillUnlimited));
  }

  async function persist() {
    try {
      const result = await storage.save(state, { flush: true });
      return result.remote === true;
    } catch (error) {
      console.error('攻略系统设置保存失败:', error.code || '', error.message, error.stack);
      return false;
    }
  }

  function initialize() {
    installListeners();
    if (readyPromise) return readyPromise;
    readyPromise = storage.load()
      .then((saved) => { state = saved; })
      .catch((error) => {
        console.error('攻略系统设置读取失败:', error.code || '', error.message, error.stack);
      })
      .then(() => {
        refillUnlimited();
        return snapshot();
      });
    return readyPromise;
  }

  async function setUnlimitedStamina(enabled) {
    await initialize();
    state.unlimitedStamina = enabled === true;
    if (state.unlimitedStamina) refillUnlimited();
    const durable = await persist();
    root.Game.EventBus.emit('cheat-settings-changed', { ...snapshot(), durable });
    return persistence.result('攻略系统设置', true, durable, snapshot());
  }

  async function setAffinity(npcId, value) {
    await root.GameAffinity.ready();
    const next = root.GameAffinity.exportState();
    const record = next.records[npcId] || {
      affinity: 0, dialogueDay: 0, dialogueGain: 0, giftDay: 0, gifts: 0
    };
    next.records[npcId] = { ...record, affinity: clamp(value, -100, 100) };
    const result = await root.GameAffinity.restore(next);
    return persistence.result('攻略系统好感', true, result.durable, {
      snapshot: root.GameAffinity.getSnapshot(npcId)
    });
  }

  async function setRealm(realmIndex, phase = 'early') {
    await root.GameCultivation.ready();
    const levels = root.Game?.Data?.cultivationLevels?.levels || [];
    const index = clamp(realmIndex, 0, Math.max(0, levels.length - 1));
    const required = Math.max(0, Math.floor(Number(levels[index]?.exp_needed) || 0));
    const ratio = PHASE_RATIOS[phase] ?? PHASE_RATIOS.early;
    const progress = required > 0 ? Math.min(required, Math.ceil(required * ratio)) : 0;
    const result = await root.GameCultivation.restore({ realmIndex: index, progress });
    refillUnlimited();
    root.Game.EventBus.emit('player-state-changed', { player: { ...root.Game.player } });
    return result;
  }

  async function addSpiritStones(amount = 9999999) {
    await root.GameInventory.ready();
    const result = await root.GameInventory.addSpiritStones(amount, 'cheat');
    if (!result.changed) throw new Error('灵石修改失败');
    return result;
  }

  function resetLocal() {
    state = { ...DEFAULT_STATE };
    root.Game.EventBus.emit('cheat-settings-changed', { ...snapshot(), durable: true });
  }

  root.GameCheat = Object.freeze({
    initialize,
    getSnapshot: snapshot,
    setUnlimitedStamina,
    setAffinity,
    setRealm,
    addSpiritStones,
    refillUnlimited,
    resetLocal
  });

  initialize().catch((error) => {
    console.error('攻略系统初始化失败:', error.code || '', error.message, error.stack);
  });
}(window));
