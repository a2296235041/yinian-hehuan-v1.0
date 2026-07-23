(function installModelUI(root) {
  'use strict';

  let initialized = false;
  let mode = 'hidden';
  let open = false;
  let panel;
  let toggle;
  let content;
  let dialogueSelect;
  let drawSelect;
  let status;

  function optionLabel(model, recommended) {
    const parts = [];
    if (model.internalName === recommended) parts.push(model.isXL ? '★ XL' : '★');
    parts.push(model.displayName || model.internalName);
    if (model.maxContext) parts.push(`${Math.round(model.maxContext / 1024)}K`);
    if (model.price !== undefined && model.price !== null) parts.push(`${model.price} 点`);
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

  function render(state) {
    fillDialogueSelect(state);
    fillDrawSelect(state);
    dialogueSelect.disabled = state.loading;
    drawSelect.disabled = state.loading;
    status.textContent = state.loading
      ? '正在读取可用模型…'
      : '★ 为推荐模型，优先选择 XL';
  }

  function refreshMode() {
    if (!initialized) return;
    panel.hidden = mode === 'hidden';
    panel.dataset.mode = 'compact';
    toggle.hidden = mode === 'hidden';
    content.hidden = mode === 'hidden' || !open;
    toggle.setAttribute('aria-expanded', String(open));
  }

  function init() {
    if (initialized) return;
    initialized = true;
    panel = document.getElementById('model-panel');
    toggle = document.getElementById('model-panel-toggle');
    content = document.getElementById('model-panel-content');
    dialogueSelect = document.getElementById('dialogue-model');
    drawSelect = document.getElementById('draw-model');
    status = document.getElementById('model-status');

    toggle.addEventListener('click', () => {
      open = !open;
      refreshMode();
    });
    dialogueSelect.addEventListener('change', () => {
      root.GameAIModels.selectDialogueModel(dialogueSelect.value);
    });
    drawSelect.addEventListener('change', () => {
      root.GameAIModels.selectDrawModel(drawSelect.value);
    });
    document.addEventListener('pointerdown', (event) => {
      if (open && !panel.contains(event.target)) {
        open = false;
        refreshMode();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (open && event.key === 'Escape') {
        open = false;
        refreshMode();
        toggle.focus();
      }
    });
    root.GameAIModels.subscribe(render);
    refreshMode();
  }

  root.GameModelUI = {
    init,
    setMode(nextMode) {
      mode = nextMode === 'hidden' ? 'hidden' : 'compact';
      open = false;
      refreshMode();
    }
  };
}(window));
