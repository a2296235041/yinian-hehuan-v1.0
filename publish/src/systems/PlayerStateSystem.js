(function installPlayerStateSystem(root) {
  'use strict';

  let readyPromise = null;

  // 玩家会话数值放在 Game.player，长期成长则交给各自的版本化存档系统。
  // 这种拆分避免每次精力变化都进行网络写入。
  function initialize(scene, origin, npcSystem) {
    if (readyPromise) return readyPromise;
    root.Game.player = {
      origin,
      maxStamina: 12,
      stamina: 12,
      day: 1,
      maxDailyCultivation: 5,
      dailyCultivationCount: 5
    };
    root.GameExploration.initialize(
      scene.cache.json.get('exploration_regions') || [],
      scene.cache.json.get('enemies') || [],
      npcSystem
    );
    readyPromise = Promise.all([
      root.GameInventory.initialize(scene.cache.json.get('items') || []),
      root.GameCultivation.initialize(root.Game.Data.cultivationLevels || {}),
      npcSystem.ready()
    ]).then(() => {
      root.Game.player.day = root.GameAffinity.getDay();
      root.Game.EventBus.emit('player-state-ready', {
        player: { ...root.Game.player },
        cultivation: root.GameCultivation.getSnapshot(),
        inventory: root.GameInventory.getSnapshot()
      });
      root.Game.EventBus.emit('game-day-changed', {
        day: root.Game.player.day,
        durable: true
      });
      return root.Game.player;
    }).catch((error) => {
      console.error('玩家状态初始化失败:', error.code || '', error.message, error.stack);
      return root.Game.player;
    });
    return readyPromise;
  }

  root.GamePlayerState = {
    initialize,
    ready: () => readyPromise || Promise.resolve(root.Game.player)
  };
}(window));
