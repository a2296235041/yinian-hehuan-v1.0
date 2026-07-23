(function installSaveGameUI(root) {
  'use strict';

  let initialized = false;
  let busy = false;
  let actions;
  let slotSelect;
  let saveButton;
  let loadButton;
  let status;
  let statuses = [];
  let slotTouched = false;

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

  function selectedSlotId() {
    return Math.max(1, Math.min(3, Math.floor(Number(slotSelect.value) || 1)));
  }

  function selectedInfo() {
    return statuses.find((item) => item.slotId === selectedSlotId()) || {
      slotId: selectedSlotId(), hasSave: false
    };
  }

  function updateSelection() {
    const info = selectedInfo();
    loadButton.dataset.available = String(info.hasSave);
    loadButton.disabled = busy || !info.hasSave;
    status.textContent = info.hasSave
      ? `${info.originName} · 第 ${info.day} 天 · ${formatTime(info.savedAt)}`
      : `存档 ${info.slotId} 为空`;
  }

  function renderSlots(nextStatuses) {
    const selected = slotTouched ? selectedSlotId() : root.GameSave.getActiveSlot();
    statuses = nextStatuses;
    slotSelect.replaceChildren();
    statuses.forEach((info) => {
      const option = document.createElement('option');
      option.value = String(info.slotId);
      option.textContent = info.hasSave
        ? `存档 ${info.slotId} · 第 ${info.day} 天`
        : `存档 ${info.slotId} · 空`;
      slotSelect.append(option);
    });
    slotSelect.value = String(selected);
    updateSelection();
  }

  function setBusy(nextBusy, label) {
    busy = nextBusy;
    slotSelect.disabled = busy;
    saveButton.disabled = busy;
    loadButton.disabled = busy || loadButton.dataset.available !== 'true';
    if (label) status.textContent = label;
  }

  async function refresh() {
    if (!initialized) return;
    actions.hidden = !root.Game.player?.origin;
    if (actions.hidden || busy) return;
    status.textContent = '正在读取存档…';
    try {
      renderSlots(await root.GameSave.getStatuses());
    } catch (error) {
      loadButton.disabled = true;
      status.textContent = '存档状态读取失败';
      console.error('设置面板读取存档失败:', error.code || '', error.message, error.stack);
    }
  }

  async function saveGame() {
    if (busy) return;
    const info = selectedInfo();
    if (info.hasSave && !root.confirm(`确定覆盖存档 ${info.slotId} 吗？`)) return;
    setBusy(true, `正在保存到存档 ${info.slotId}…`);
    try {
      await root.GameSave.saveCurrent(info.slotId);
      root.GameAudio.sfx('success');
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
    const info = selectedInfo();
    if (busy || !info.hasSave) return;
    if (!root.confirm(`读取存档 ${info.slotId} 会覆盖当前未保存进度，确定继续吗？`)) return;
    setBusy(true, `正在读取存档 ${info.slotId}…`);
    try {
      const snapshot = await root.GameSave.loadCurrent(info.slotId);
      const scene = root.game?.scene?.getScene('GameScene');
      scene?.dialogueSystem?.endDialogue();
      scene?.showSavedLocation(snapshot.location);
      root.GameAudio.sfx('success');
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
    slotSelect = document.getElementById('settings-save-slot');
    saveButton = document.getElementById('settings-save');
    loadButton = document.getElementById('settings-load');
    status = document.getElementById('settings-save-status');
    slotSelect.addEventListener('change', () => {
      slotTouched = true;
      updateSelection();
    });
    saveButton.addEventListener('click', saveGame);
    loadButton.addEventListener('click', loadGame);
    root.Game.EventBus.on('player-state-ready', refresh);
    root.Game.EventBus.on('manual-save-changed', refresh);
    refresh();
  }

  root.GameSaveUI = { init, refresh };
}(window));
