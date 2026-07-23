(function installAIModels(root) {
  'use strict';

  const dialoguePicker = root.GamefyRecipes.createModelPicker({
    storageKey: 'dialogue-model-choice'
  });
  const listeners = new Set();
  let initPromise = null;
  let state = {
    loading: true,
    dialogueModels: [],
    drawModels: [],
    dialogueModel: 'default',
    drawModel: 'anime',
    recommendedModel: 'default'
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

  function flattenDialogueModels(info) {
    const details = new Map();
    (info.categories || []).forEach((category) => {
      (category.modelGroups || []).forEach((group) => {
        (group.contexts || []).forEach((context) => {
          if (!context?.internalName) return;
          details.set(context.internalName, {
            categoryName: category.name || category.key || '可用模型',
            seriesName: group.seriesKey || '',
            icon: group.icon || '',
            price: group.price,
            maxContext: context.maxContext,
            description: context.description || group.description || '',
            isRecommended: context.isRecommended === true || group.isRecommended === true
          });
        });
      });
    });
    const byId = new Map();
    (info.models || []).forEach((model) => {
      if (!model?.internalName) return;
      byId.set(model.internalName, {
        ...model,
        ...details.get(model.internalName)
      });
    });
    details.forEach((detail, internalName) => {
      if (!byId.has(internalName)) {
        byId.set(internalName, {
          internalName,
          displayName: internalName,
          ...detail
        });
      }
    });
    return [...byId.values()].map((model) => ({
      ...model,
      displayName: model.displayName || model.internalName,
      description: model.description || '平台提供的对话模型',
      categoryName: model.categoryName || '可用模型',
      isXL: /(^|[-_\s])xl($|[-_\s])/i.test(`${model.internalName} ${model.displayName}`)
    }));
  }

  function chooseRecommended(models, platformDefault) {
    const ranked = models.slice().sort((a, b) => {
      const score = (model) => (model.isXL ? 100 : 0)
        + (model.isRecommended ? 20 : 0)
        + Math.min(15, (Number(model.maxContext) || 0) / 4096)
        + (/16k/i.test(model.internalName) ? 0 : 4);
      return score(b) - score(a);
    });
    return ranked[0]?.internalName || platformDefault || 'default';
  }

  async function loadDrawModels() {
    try {
      const info = await root.dzmm?.draw?.generateModels?.();
      const models = (Array.isArray(info?.models) ? info.models : [])
        .filter((model) => typeof model?.id === 'string')
        .map((model) => ({
          id: model.id,
          displayName: model.displayName || model.id,
          description: model.description || '二次元场景绘制模型'
        }));
      const fallback = models.length ? models : [
        { id: 'anime', displayName: 'anime', description: '通用二次元绘图' },
        { id: 'iroha', displayName: 'iroha', description: '细腻二次元绘图' }
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
          { id: 'anime', displayName: 'anime', description: '通用二次元绘图' },
          { id: 'iroha', displayName: 'iroha', description: '细腻二次元绘图' }
        ],
        selected: 'anime'
      };
    }
  }

  function initialize() {
    if (initPromise) return initPromise;
    initPromise = Promise.all([dialoguePicker.listModels(), loadDrawModels()])
      .then(async ([dialogueInfo, draw]) => {
        const models = flattenDialogueModels(dialogueInfo);
        const dialogueModels = models.length ? models : [{
          internalName: 'default',
          displayName: '平台默认',
          description: '由平台自动选择可用模型',
          categoryName: '默认'
        }];
        const recommendedModel = chooseRecommended(dialogueModels, dialogueInfo.defaultModel);
        let dialogueModel = models.length
          ? await dialoguePicker.getSelectedModel()
          : 'default';
        if (models.length && dialoguePicker.getPersistenceState().backend === 'memory') {
          dialogueModel = recommendedModel;
          await dialoguePicker.setSelectedModel(dialogueModel);
        }
        state = {
          loading: false,
          dialogueModels,
          drawModels: draw.models,
          dialogueModel,
          drawModel: draw.selected,
          recommendedModel
        };
        notify();
        return snapshot();
      });
    return initPromise;
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
    whenReady: initialize,
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
