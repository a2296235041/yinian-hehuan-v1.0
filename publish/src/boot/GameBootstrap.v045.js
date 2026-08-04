/* bootstrap 0.4.5 */ (function startGame(root) {
  'use strict';

  function runService(label, action) {
    try {
      const result = action();
      result?.catch?.((error) => {
        console.error(`${label}初始化失败:`, error.code || '', error.message, error.stack);
      });
    } catch (error) {
      console.error(`${label}初始化失败:`, error.code || '', error.message, error.stack);
    }
  }

  function initializeServices() {
    runService('省流设置', () => root.GameTrafficSaver.init());
    runService('省流界面', () => root.GameTrafficSaverUI.init());
    runService('模型界面', () => root.GameModelUI.init());
    runService('对话面板', () => root.GameDialoguePanel.init());
    runService('多人互动面板', () => root.GamePrivateGroupDialoguePanel.init());
    runService('赠礼面板', () => root.GameGiftPanel.init());
    runService('突破面板', () => root.GameBreakthrough.init());
    runService('存档界面', () => root.GameSaveUI.init());
    runService('赛事面板', () => root.GameTournamentPanel.init());
    runService('赛事进度', () => root.GameTournament.initialize());
    runService('自动存档', () => root.GameAutoSave.init());
    runService('存档生命周期', () => root.GameSaveLifecycle.init());
    runService('AI模型', () => root.GameAIModels.initialize());
  }

  function initializeGame() {
    root.PlatformBridge.progress({
      phase: 'runtime_initializing',
      message: '正在启动游戏引擎'
    });
    const config = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: 1280,
      height: 720,
      backgroundColor: '#09100e',
      render: { antialias: true, roundPixels: true },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        expandParent: true
      },
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
      },
      input: {
        windowEvents: false
      },
      scene: [
        Game.Scenes.BootScene,
        Game.Scenes.PreloadScene,
        Game.Scenes.MainMenuScene,
        Game.Scenes.CharacterCreationScene,
        Game.Scenes.GameScene,
        Game.Scenes.PrivateScene,
        Game.Scenes.ShopScene,
        Game.Scenes.InventoryScene,
        Game.Scenes.ExplorationScene,
        Game.Scenes.BattleScene,
        Game.Scenes.UIScene
      ]
    };

    root.game = new Phaser.Game(config);
    root.GameOrientation.init();
    initializeServices();

    document.addEventListener('pointerdown', () => root.GameAudio.start(), {
      once: true,
      capture: true
    });
    document.getElementById('boot-retry')?.addEventListener('click', () => {
      root.location.reload();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) root.GameAudio.pause();
      else root.GameAudio.resume();
    });
  }

  try {
    initializeGame();
  } catch (error) {
    console.error('游戏初始化失败:', error.message, error.stack);
    root.PlatformBridge.fail('GAME_INIT_FAILED', error.message);
  }
}(window));
