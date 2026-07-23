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

  function fillSelect(select, items, value, idKey, labelKey) {
    select.replaceChildren();
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item[idKey];
      option.textContent = item[labelKey] || item[idKey];
      select.append(option);
    });
    select.value = value;
  }

  function render(state) {
    fillSelect(
      dialogueSelect,
      state.dialogueModels,
      state.dialogueModel,
      'internalName',
      'displayName'
    );
    fillSelect(drawSelect, state.drawModels, state.drawModel, 'id', 'displayName');
    dialogueSelect.disabled = state.loading;
    drawSelect.disabled = state.loading;
    status.textContent = state.loading ? '正在读取可用模型…' : '选择会立即用于下一次请求';
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
    status = document.getElementById('model-status');

    panel.addEventListener('pointerdown', (event) => event.stopPropagation());
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
