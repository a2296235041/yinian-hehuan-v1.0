(function installOverlayGuard(root) {
  'use strict';

  const SceneClass = root.Game?.Scenes?.UIScene;
  if (!SceneClass) throw new Error('UIScene 尚未注册，无法安装覆盖层保护');

  const originalOpenOverlay = SceneClass.prototype.openOverlay;

  function deadline(promise, timeoutMs) {
    let timer;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = root.setTimeout(() => reject(new Error('玩家状态初始化超时')), timeoutMs);
      })
    ]).finally(() => root.clearTimeout(timer));
  }

  function recover(scene) {
    try {
      scene.scene.stop('ExplorationScene');
      ['GameScene', 'UIScene'].forEach((key) => {
        const target = scene.scene.get(key);
        scene.scene.setVisible(true, key);
        if (target?.input) target.input.enabled = true;
        if (target?.sys?.isPaused()) scene.scene.resume(key);
      });
      root.GameExplorationPanel?.close?.();
      root.GameModelUI?.setMode?.('compact');
    } catch (error) {
      console.error('出山页面恢复失败:', error.message, error.stack);
    }
  }

  SceneClass.prototype.openOverlay = async function openOverlaySafely(sceneKey) {
    if (sceneKey !== 'ExplorationScene') {
      return originalOpenOverlay.call(this, sceneKey);
    }
    if (this.overlayOpening || this.scene.isActive(sceneKey)) return;
    this.overlayOpening = true;
    try {
      await deadline(root.Game.systemsReady || Promise.resolve(), 8000);
      this.scene.launch(sceneKey);
      await new Promise((resolve) => root.requestAnimationFrame(resolve));
      if (!this.scene.isActive(sceneKey)) throw new Error('出山场景未能启动');
    } catch (error) {
      console.error('打开出山页面失败:', error.code || '', error.message, error.stack);
      recover(this);
      this.showLog?.(`出山页面启动失败：${error.message || '未知错误'}`);
    } finally {
      this.overlayOpening = false;
    }
  };
}(window));
