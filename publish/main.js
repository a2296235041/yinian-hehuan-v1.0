(function startGame(root) {
  'use strict';

  function ensureModule(globalName, source) {
    if (root[globalName]) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const separator = source.includes('?') ? '&' : '?';
      script.src = `${source}${separator}boot-retry=${Date.now()}`;
      script.onload = () => {
        if (root[globalName]) {
          resolve();
          return;
        }
        reject(new Error(`${globalName} 模块加载后未注册`));
      };
      script.onerror = () => reject(new Error(`${globalName} 模块加载失败`));
      document.head.append(script);
    });
  }

  function initializeGame() {
    root.GameModelUI.init();
    root.GameDialoguePanel.init();
    root.GameGiftPanel.init();
    root.GameBreakthrough.init();
    root.GameSaveUI.init();
    root.GameAIModels.initialize().catch((error) => {
      console.error('AI 模型初始化失败:', error.code || '', error.message, error.stack);
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

    const audioButton = document.getElementById('audio-toggle');
    const audioState = document.getElementById('audio-state');
    function refreshAudioButton() {
      const muted = root.GameAudio.isMuted();
      audioButton.checked = !muted;
      audioState.textContent = muted ? '已静音' : '已开启';
    }

    document.addEventListener('pointerdown', () => root.GameAudio.start(), {
      once: true,
      capture: true
    });
    audioButton.addEventListener('change', (event) => {
      event.stopPropagation();
      root.GameAudio.start().then(() => {
        if (audioButton.checked === root.GameAudio.isMuted()) root.GameAudio.toggle();
        refreshAudioButton();
      });
    });
    document.getElementById('boot-retry').addEventListener('click', () => {
      root.location.reload();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) root.GameAudio.pause();
      else root.GameAudio.resume();
    });

    refreshAudioButton();
  }

  async function boot() {
    try {
      await ensureModule('GameModelUI', './src/ai/ModelUI.js');
      initializeGame();
    } catch (error) {
      console.error('游戏初始化失败:', error.message, error.stack);
      root.PlatformBridge.fail('GAME_INIT_FAILED', error.message);
    }
  }

  boot();
}(window));
