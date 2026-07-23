(function installModelPickerRecipe(root) {
  'use strict';

function createModelPicker({ dzmmRef = () => root.dzmm, storageKey = 'model-choice' } = {}) {
  let cached = null;
  let selected = null;
  let persistence = { backend: 'none', durable: false };

  function modelIds(info) {
    return new Set((info?.models || [])
      .map(model => model?.internalName)
      .filter(name => typeof name === 'string' && name.length > 0));
  }

  function localStore() {
    try { return root.localStorage || null; } catch { return null; }
  }

  function unwrap(value) {
    return value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'value')
      ? value.value
      : value;
  }

  async function clearStoredModel() {
    try { await dzmmRef()?.kv?.delete?.(storageKey); } catch {}
    try { localStore()?.removeItem?.(storageKey); } catch {}
  }

  async function listModels() {
    const dzmm = dzmmRef();
    try {
      const data = await dzmm?.models?.list?.();
      const models = Array.isArray(data?.models) ? data.models : [];
      cached = {
        models,
        categories: Array.isArray(data?.categories) ? data.categories : [],
        defaultModel: data?.defaultModel || 'default'
      };
      return cached;
    } catch {
      cached = { models: [], categories: [], defaultModel: 'default' };
      return cached;
    }
  }

  async function getDefaultModel() {
    if (!cached) await listModels();
    const ids = modelIds(cached);
    if (ids.has(cached?.defaultModel)) return cached.defaultModel;
    return cached?.models?.[0]?.internalName || 'default';
  }

  async function getSelectedModel() {
    if (!cached) await listModels();
    const ids = modelIds(cached);
    if (selected && ids.has(selected)) return selected;
    try {
      const remote = unwrap(await dzmmRef()?.kv?.get?.(storageKey));
      if (typeof remote === 'string' && ids.has(remote)) {
        selected = remote;
        persistence = { backend: 'remote', durable: true };
        return selected;
      }
      if (remote) await clearStoredModel();
    } catch {}
    try {
      const stored = localStore()?.getItem?.(storageKey);
      if (stored && ids.has(stored)) {
        selected = stored;
        persistence = { backend: 'local', durable: true };
        return selected;
      }
      if (stored) await clearStoredModel();
    } catch {}
    selected = await getDefaultModel();
    persistence = { backend: 'memory', durable: false };
    return selected;
  }

  async function setSelectedModel(model) {
    if (!cached) await listModels();
    if (!modelIds(cached).has(model)) {
      selected = null;
      await clearStoredModel();
      return { ok: false, selected: null, backend: 'none', durable: false, reason: 'invalid_model' };
    }
    selected = model;
    try {
      const kv = dzmmRef()?.kv;
      if (typeof kv?.put === 'function') {
        await kv.put(storageKey, model);
        persistence = { backend: 'remote', durable: true };
        return { ok: true, selected, ...persistence };
      }
    } catch {}
    try {
      const storage = localStore();
      if (typeof storage?.setItem === 'function') {
        storage.setItem(storageKey, model);
        persistence = { backend: 'local', durable: true };
        return { ok: true, selected, ...persistence };
      }
    } catch {}
    persistence = { backend: 'memory', durable: false };
    return { ok: true, selected, ...persistence };
  }

  return {
    listModels, getDefaultModel, getSelectedModel, setSelectedModel,
    getPersistenceState: () => ({ ...persistence }),
  };
}

  const recipes = root.GamefyRecipes || (root.GamefyRecipes = {});
  recipes.createModelPicker = createModelPicker;
}(typeof window !== 'undefined' ? window : globalThis));
