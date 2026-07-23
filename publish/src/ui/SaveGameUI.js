(function installSaveGameUI(root) {
  'use strict';

  let initialized = false;
  let busy = false;
  let actions;
  let saveButton;
  let loadButton;
  let status;

  function formatTime(value) {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    } catch (_) {
      return '';
    }
  }

  function setBusy(nextBusy, label) {
    busy = nextBusy;
    saveButton.disabled = busy;
    loadButton.disabled = busy || loadButton.dataset.available !== 'true';
    if (label) status.textContent = label;
  }

  // 设置面板只在玩家已经进入正式游戏后显示存读档区域。
  async function refresh() {
    if (!initialized) return;
    actions.hidden = !root.Game.player?.origin;
    if (actions.hidden || busy) return;
    status.textContent = '正在读取存档…';
    try {
      const info = await root.GameSave.getStatus();
      loadButton.dataset.available = String(info.hasSave);
      loadButton.disabled = !info.hasSave;
      status.textContent = info.hasSave
        ? `第 ${info.day} 天 · ${formatTime(info.savedAt)}`
        : '暂无手动存档';
    } catch (error) {
      loadButton.dataset.available = 'false';
      loadButton.disabled = true;
      status.textContent = '存档状态读取失败';
      console.error('设置面板读取存档失败:', error.code || '', error.message, error.stack);
    }
  }

  async function saveGame() {
    if (busy) return;
    setBusy(true, '正在保存到平台…');
    try {
      await root.GameSave.saveCurrent();
      root.GameAudio.sfx('success');
      status.textContent = '存档成功';
    } catch (error) {
      root.GameAudio.sfx('deny');
      status.textContent = error.message || '存档失败';
      console.error('手动存档失败:', error.code || '', error.message, error.stack);
    } finally {
      setBusy(false);
      await refresh();
    }
  }

  async function loadGame() {
    if (busy || loadButton.dataset.available !== 'true') return;
    if (!root.confirm('读档会覆盖当前未保存的进度，确定继续吗？')) return;
    setBusy(true, '正在恢复存档…');
    try {
      const snapshot = await root.GameSave.loadCurrent();
      // 数值恢复后关闭旧对话，并按存档记录重新绘制所在建筑。
      const scene = root.game?.scene?.getScene('GameScene');
      scene?.dialogueSystem?.endDialogue();
      scene?.showSavedLocation(snapshot.location);
      root.GameAudio.sfx('success');
      status.textContent = '读档完成';
      root.GameModelUI.close();
    } catch (error) {
      root.GameAudio.sfx('deny');
      status.textContent = error.message || '读档失败';
      console.error('游戏内读档失败:', error.code || '', error.message, error.stack);
    } finally {
      setBusy(false);
      await refresh();
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    actions = document.getElementById('settings-save-actions');
    saveButton = document.getElementById('settings-save');
    loadButton = document.getElementById('settings-load');
    status = document.getElementById('settings-save-status');
    saveButton.addEventListener('click', saveGame);
    loadButton.addEventListener('click', loadGame);
    root.Game.EventBus.on('player-state-ready', refresh);
    root.Game.EventBus.on('manual-save-changed', refresh);
    refresh();
  }

  root.GameSaveUI = { init, refresh };
}(window));
