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
  let detail;
  let status;
  let latestState = null;

  function optionLabel(model, recommended) {
    const parts = [];
    if (model.internalName === recommended) parts.push(model.isXL ? 'XL 推荐' : '推荐');
    parts.push(model.displayName || model.internalName);
    if (model.maxContext) parts.push(`${Math.round(model.maxContext / 1024)}K`);
    if (model.price !== undefined && model.price !== null) parts.push(`消耗 ${model.price}`);
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

  function renderDetail() {
    if (!latestState) return;
    const model = latestState.dialogueModels
      .find((item) => item.internalName === dialogueSelect.value);
    if (!model) {
      detail.textContent = '';
      return;
    }
    const parts = [];
    if (model.internalName === latestState.recommendedModel) {
      parts.push(model.isXL ? '推荐 XL' : '推荐');
    }
    if (model.seriesName) parts.push(model.seriesName);
    if (model.maxContext) parts.push(`${Math.round(model.maxContext / 1024)}K 上下文`);
    if (model.price !== undefined && model.price !== null) parts.push(`消耗 ${model.price}`);
    if (model.description) parts.push(model.description);
    detail.textContent = parts.join(' · ');
  }

  function render(state) {
    latestState = state;
    fillDialogueSelect(state);
    fillDrawSelect(state);
    dialogueSelect.disabled = state.loading;
    drawSelect.disabled = state.loading;
    status.textContent = state.loading
      ? '正在读取可用模型…'
      : '默认优先推荐 XL，选择会用于下一次请求';
    renderDetail();
  }

  function refreshMode() {
    if (!initialized) return;
    panel.hidden = mode === 'hidden';
    panel.dataset.mode = mode;
    toggle.hidden = mode !== 'compact';
    content.hidden = mode === 'compact' && !open;
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
    detail = document.getElementById('dialogue-model-detail');
    status = document.getElementById('model-status');

    panel.addEventListener('pointerdown', (event) => event.stopPropagation());
    toggle.addEventListener('click', () => {
      open = !open;
      refreshMode();
    });
    dialogueSelect.addEventListener('change', () => {
      root.GameAIModels.selectDialogueModel(dialogueSelect.value);
      renderDetail();
    });
    drawSelect.addEventListener('change', () => {
      root.GameAIModels.selectDrawModel(drawSelect.value);
    });
    root.GameAIModels.subscribe(render);
    refreshMode();
  }

  root.GameModelUI = {
    init,
    setMode(nextMode) {
      mode = nextMode;
      open = nextMode === 'menu';
      refreshMode();
    }
  };
}(window));
