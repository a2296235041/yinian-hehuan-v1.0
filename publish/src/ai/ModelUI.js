(function installModelUI(root) {
  'use strict';

  let initialized = false;
  let mode = 'hidden';
  let open = false;
  let panel;
  let toggle;
  let content;
  let blocker;
  let dialogueSelect;
  let drawSelect;
  let status;
  let audioToggle;
  let audioState;
  let gameInputEnabled = null;
  const sceneInputStates = new Map();

  function optionLabel(model, recommended) {
    const parts = [];
    if (model.internalName === recommended) parts.push('推荐');
    parts.push(model.displayName || model.internalName);
    if (model.maxContext) parts.push(`${Math.round(model.maxContext / 1024)}K`);
    return parts.join(' · ');
  }

  function fillDialogueSelect(state) {
    dialogueSelect.replaceChildren();
    const groups = new Map();
    state.dialogueModels.forEach((model) => {
      const label = model.categoryName || '可用模型';
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(model);
    });
    groups.forEach((models, label) => {
      const group = document.createElement('optgroup');
      group.label = label;
      models.forEach((model) => {
        const option = document.createElement('option');
        option.value = model.internalName;
        option.textContent = optionLabel(model, state.recommendedModel);
        group.append(option);
      });
      dialogueSelect.append(group);
    });
    dialogueSelect.value = state.dialogueModel;
  }

  function fillDrawSelect(state) {
    drawSelect.replaceChildren();
    state.drawModels.forEach((model) => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.displayName || model.id;
      drawSelect.append(option);
    });
    drawSelect.value = state.drawModel;
  }

  function renderModels(state) {
    fillDialogueSelect(state);
    fillDrawSelect(state);
    dialogueSelect.disabled = state.loading;
    drawSelect.disabled = state.loading;
    status.textContent = state.loading ? '正在读取可用模型…' : '模型选择会自动保存';
  }

  function lockGameInput() {
    const game = root.game;
    if (!game) return;
    if (game.input && gameInputEnabled === null) {
      gameInputEnabled = game.input.enabled;
      game.input.enabled = false;
    }
    (game.scene?.getScenes?.(false) || []).forEach((scene) => {
      if (!scene?.input || sceneInputStates.has(scene)) return;
      sceneInputStates.set(scene, scene.input.enabled);
      scene.input.enabled = false;
    });
  }

  function unlockGameInput() {
    sceneInputStates.forEach((enabled, scene) => {
      if (scene?.input) scene.input.enabled = enabled;
    });
    sceneInputStates.clear();
    if (root.game?.input && gameInputEnabled !== null) {
      root.game.input.enabled = gameInputEnabled;
    }
    gameInputEnabled = null;
  }

  function refreshAudio() {
    const muted = root.GameAudio.isMuted();
    audioToggle.checked = !muted;
    audioState.textContent = muted ? '已关闭' : '已开启';
  }

  function setOpen(nextOpen, focusToggle = false) {
    const next = Boolean(nextOpen) && mode !== 'hidden';
    if (open === next) return;
    open = next;
    content.hidden = !open;
    blocker.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      lockGameInput();
      refreshAudio();
      root.GameSaveUI?.refresh();
      document.getElementById('settings-close')?.focus();
    } else {
      unlockGameInput();
      if (focusToggle) toggle.focus();
    }
  }

  function refreshMode() {
    if (!initialized) return;
    const hidden = mode === 'hidden';
    panel.hidden = hidden;
    toggle.hidden = hidden;
    if (hidden) setOpen(false);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    panel = document.getElementById('model-panel');
    toggle = document.getElementById('model-panel-toggle');
    content = document.getElementById('model-panel-content');
    blocker = document.getElementById('settings-blocker');
    dialogueSelect = document.getElementById('dialogue-model');
    drawSelect = document.getElementById('draw-model');
    status = document.getElementById('model-status');
    audioToggle = document.getElementById('audio-toggle');
    audioState = document.getElementById('audio-state');

    panel.addEventListener('pointerdown', (event) => event.stopPropagation());
    blocker.addEventListener('pointerdown', (event) => event.stopPropagation());
    blocker.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(false, true);
    });
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(!open);
    });
    document.getElementById('settings-close').addEventListener('click', () => {
      setOpen(false, true);
    });
    dialogueSelect.addEventListener('change', () => {
      root.GameAIModels.selectDialogueModel(dialogueSelect.value);
    });
    drawSelect.addEventListener('change', () => {
      root.GameAIModels.selectDrawModel(drawSelect.value);
    });
    audioToggle.addEventListener('change', async () => {
      await root.GameAudio.start();
      if (audioToggle.checked === root.GameAudio.isMuted()) root.GameAudio.toggle();
      refreshAudio();
    });
    document.addEventListener('keydown', (event) => {
      if (open && event.key === 'Escape') setOpen(false, true);
    });
    root.Game.EventBus.on('ai-dialogue-open', () => setOpen(false));
    root.GameAIModels.subscribe(renderModels);
    refreshAudio();
    refreshMode();
  }

  root.GameModelUI = {
    init,
    setMode(nextMode) {
      mode = nextMode === 'hidden' ? 'hidden' : 'compact';
      refreshMode();
    },
    close() {
      setOpen(false, true);
    }
  };
}(window));
