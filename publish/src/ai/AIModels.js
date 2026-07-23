(function installAIModels(root) {
  'use strict';

  const dialoguePicker = root.GamefyRecipes.createModelPicker({
    storageKey: 'dialogue-model-choice'
  });
  const listeners = new Set();
  let state = {
    loading: true,
    dialogueModels: [],
    drawModels: [],
    dialogueModel: 'default',
    drawModel: 'anime'
  };

  function snapshot() {
    return {
      ...state,
      dialogueModels: state.dialogueModels.slice(),
      drawModels: state.drawModels.slice()
    };
  }

  function notify() {
    const next = snapshot();
    listeners.forEach((listener) => listener(next));
  }

  function unwrap(value) {
    return value && typeof value === 'object' && 'value' in value ? value.value : value;
  }

  async function loadDrawModels() {
    try {
      const info = await root.dzmm?.draw?.generateModels?.();
      const models = Array.isArray(info?.models) ? info.models : [];
      const normalized = models
        .filter((model) => typeof model?.id === 'string')
        .map((model) => ({
          id: model.id,
          displayName: model.displayName || model.id
        }));
      const fallback = normalized.length ? normalized : [
        { id: 'anime', displayName: 'anime' },
        { id: 'iroha', displayName: 'iroha' }
      ];
      let selected = info?.defaultModel || fallback[0].id;
      try {
        const stored = unwrap(await root.dzmm?.kv?.get?.('draw-model-choice'));
        if (fallback.some((model) => model.id === stored)) selected = stored;
      } catch {}
      return { models: fallback, selected };
    } catch {
      return {
        models: [
          { id: 'anime', displayName: 'anime' },
          { id: 'iroha', displayName: 'iroha' }
        ],
        selected: 'anime'
      };
    }
  }

  async function initialize() {
    const dialogueInfo = await dialoguePicker.listModels();
    const dialogueModels = dialogueInfo.models.length
      ? dialogueInfo.models
      : [{ internalName: 'default', displayName: '平台默认' }];
    const dialogueModel = dialogueInfo.models.length
      ? await dialoguePicker.getSelectedModel()
      : 'default';
    const draw = await loadDrawModels();
    state = {
      loading: false,
      dialogueModels,
      drawModels: draw.models,
      dialogueModel,
      drawModel: draw.selected
    };
    notify();
  }

  async function selectDialogueModel(model) {
    if (!state.dialogueModels.some((item) => item.internalName === model)) return false;
    state.dialogueModel = model;
    notify();
    if (model !== 'default') await dialoguePicker.setSelectedModel(model);
    return true;
  }

  async function selectDrawModel(model) {
    if (!state.drawModels.some((item) => item.id === model)) return false;
    state.drawModel = model;
    notify();
    try {
      await root.dzmm?.kv?.put?.('draw-model-choice', model);
    } catch (error) {
      console.error('绘图模型偏好保存失败:', error.code || '', error.message, error.stack);
    }
    return true;
  }

  root.GameAIModels = {
    initialize,
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    selectDialogueModel,
    selectDrawModel,
    getDialogueModel: () => state.dialogueModel || 'default',
    getDrawModel: () => state.drawModel || 'anime',
    getState: snapshot
  };
}(window));
