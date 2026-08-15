(function installSaveRecovery(root) {
  'use strict';

  const errors = new Map();
  let initialized = false;
  let newGameMode = false;
  let panel;
  let summary;
  let details;
  let detailText;
  let list;
  let retryButton;
  let newGameButton;

  function storageId(key) {
    const value = String(key || '');
    return value.includes(':') ? value.split(':').pop() : value;
  }

  function isCriticalKey(key) {
    const id = storageId(key);
    return /^(auto-save|manual-save(?:-\d+)?|affection|inventory|cultivation|player-growth|tournament-progress)$/.test(id);
  }

  function safeMessage(error) {
    return String(error?.message || error || '未知存档读取错误').slice(0, 240);
  }

  function criticalErrors() {
    return [...errors.values()].filter((item) => item.critical);
  }

  function render() {
    if (!panel) return;
    const critical = criticalErrors();
    panel.hidden = newGameMode || critical.length === 0;
    if (panel.hidden) return;
    summary.textContent = `检测到 ${critical.length} 项关键存档无法读取，已暂停进入游戏，避免覆盖或使用错误进度。`;
    list.replaceChildren();
    errors.forEach((item) => {
      const row = document.createElement('li');
      row.textContent = `${item.label}：${item.message}`;
      list.append(row);
    });
    detailText.textContent = [...errors.entries()]
      .map(([key, item]) => `${key}\n${item.message}`)
      .join('\n\n');
    details.hidden = errors.size === 0;
  }

  function reportStorageReadFailure(key, error, label = '') {
    const id = String(key || 'unknown-storage');
    errors.set(id, {
      label: label || storageId(id) || '存档数据',
      message: safeMessage(error),
      critical: isCriticalKey(id)
    });
    if (!newGameMode) render();
  }

  function retry() {
    if (retryButton.disabled) return;
    retryButton.disabled = true;
    retryButton.textContent = '正在重新读取…';
    root.location.reload();
  }

  function startNewGame() {
    if (newGameButton.disabled) return;
    newGameMode = true;
    errors.clear();
    render();
    root.Game?.EventBus?.emit('save-recovery-new-game');
  }

  function init() {
    if (initialized) return;
    initialized = true;
    panel = document.getElementById('save-recovery');
    summary = document.getElementById('save-recovery-summary');
    details = document.getElementById('save-recovery-details');
    detailText = document.getElementById('save-recovery-detail-text');
    list = document.getElementById('save-recovery-errors');
    retryButton = document.getElementById('save-recovery-retry');
    newGameButton = document.getElementById('save-recovery-new-game');
    retryButton?.addEventListener('click', retry);
    newGameButton?.addEventListener('click', startNewGame);
    render();
  }

  root.GameSaveRecovery = Object.freeze({
    init,
    reportStorageReadFailure,
    isCriticalKey,
    isNewGameMode: () => newGameMode,
    hasBlockingError: () => criticalErrors().length > 0
  });
}(window));
