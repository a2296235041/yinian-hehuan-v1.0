(function installPlayerStateSystem(root) {
  'use strict';

  let readyPromise = null;

  function numberOr(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function normalizePlayer(origin, saved = {}) {
    const maxStamina = Math.max(1, Math.floor(numberOr(saved.maxStamina, 12)));
    const maxDailyCultivation = Math.max(1, Math.floor(numberOr(saved.maxDailyCultivation, 5)));
    return {
      origin,
      maxStamina,
      stamina: Math.max(0, Math.min(maxStamina, Math.floor(numberOr(saved.stamina, maxStamina)))),
      day: Math.max(1, Math.floor(Number(saved.day) || 1)),
      periodIndex: root.GameTime.normalizeIndex(saved.periodIndex),
      maxDailyCultivation,
      dailyCultivationCount: Math.max(0, Math.min(
        maxDailyCultivation,
        Math.floor(numberOr(saved.dailyCultivationCount, maxDailyCultivation))
      ))
    };
  }

  function emitReady() {
    root.Game.EventBus.emit('player-state-ready', {
      player: { ...root.Game.player },
      cultivation: root.GameCultivation.getSnapshot(),
      inventory: root.GameInventory.getSnapshot(),
      growth: root.GamePlayerGrowth.getSnapshot()
    });
    root.Game.EventBus.emit('game-day-changed', {
      day: root.Game.player.day,
      durable: true
    });
    root.GameTime.emitCurrent('player-state-ready');
    root.Game.EventBus.emit('player-state-changed', { player: { ...root.Game.player } });
  }

  async function applySnapshot(snapshot) {
    await Promise.all([
      root.GameInventory.restore(snapshot?.inventory),
      root.GameCultivation.restore(snapshot?.cultivation),
      root.GamePlayerGrowth.restore(snapshot?.growth, snapshot?.player?.origin),
      root.GameAffinity.restore(snapshot?.affinity),
      root.GameTournament.restore(snapshot?.tournament)
    ]);
    root.GameAI?.restoreSessions?.(snapshot?.dialogueHistory);
    const origin = snapshot?.player?.origin || root.Game.player?.origin;
    root.Game.player = normalizePlayer(origin, snapshot?.player);
    root.Game.player.day = root.GameAffinity.getDay();
    root.GameCultivation.syncPlayerDailyLimit(root.Game.player);
    emitReady();
    return root.Game.player;
  }

  // 玩家会话数值放在 Game.player，长期成长则交给各自的版本化存档系统。
  // 这种拆分避免每次精力变化都进行网络写入。
  function initialize(scene, origin, npcSystem, savedSnapshot = null, newGame = false) {
    if (readyPromise) return readyPromise;
    root.Game.player = normalizePlayer(origin);
    const items = scene.cache.json.get('items') || [];
    root.GameExploration.initialize(
      scene.cache.json.get('exploration_regions') || [],
      scene.cache.json.get('enemies') || [],
      npcSystem
    );
    readyPromise = Promise.all([
      root.GameInventory.initialize(items),
      root.GameCultivation.initialize(root.Game.Data.cultivationLevels || {}),
      root.GamePlayerGrowth.initialize(),
      npcSystem.ready()
    ]).then(async () => {
      root.GameAI?.resetSessions?.();
      if (savedSnapshot) return applySnapshot(savedSnapshot);
      if (newGame) {
        return applySnapshot(root.GameSaveData.createFreshSnapshot(origin, items));
      }
      root.Game.player.day = root.GameAffinity.getDay();
      root.GameCultivation.syncPlayerDailyLimit(root.Game.player);
      emitReady();
      return root.Game.player;
    }).catch((error) => {
      console.error('玩家状态初始化失败:', error.code || '', error.message, error.stack);
      root.GameSaveRecovery?.reportStorageReadFailure?.('player-state', error, '玩家状态');
      if (newGame && root.GameSaveRecovery?.isNewGameMode?.()) return root.Game.player;
      throw error;
    });
    return readyPromise;
  }

  root.GamePlayerState = {
    initialize,
    ready: () => readyPromise || Promise.resolve(root.Game.player),
    restore(snapshot) {
      root.GameAI?.resetSessions?.();
      return (readyPromise || Promise.reject(new Error('玩家状态尚未初始化')))
        .then(() => applySnapshot(snapshot));
    }
  };
}(window));
