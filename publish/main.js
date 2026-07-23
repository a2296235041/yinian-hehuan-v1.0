(function startGame(root) {
  'use strict';

  try {
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
        Game.Scenes.UIScene
      ]
    };

    root.game = new Phaser.Game(config);

    const audioButton = document.getElementById('audio-toggle');
    function refreshAudioButton() {
      const muted = root.GameAudio.isMuted();
      audioButton.innerHTML = muted ? '&#128263;' : '&#128266;';
      audioButton.setAttribute('aria-pressed', String(muted));
    }

    document.addEventListener('pointerdown', () => root.GameAudio.start(), {
      once: true,
      capture: true
    });
    audioButton.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      root.GameAudio.start().then(() => {
        root.GameAudio.toggle();
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

    const refreshScale = () => root.game?.scale?.refresh();
    root.addEventListener('resize', refreshScale);
    if (root.ResizeObserver) {
      new ResizeObserver(refreshScale).observe(document.getElementById('game-shell'));
    }
    refreshAudioButton();
  } catch (error) {
    console.error('游戏初始化失败:', error.message, error.stack);
    root.PlatformBridge.fail('GAME_INIT_FAILED', error.message);
  }
}(window));
