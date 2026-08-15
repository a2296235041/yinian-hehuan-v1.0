(function installTutorialState(root) {
  'use strict';

  const KEY = 'hehuan:tutorial';
  const VERSION = 1;
  const fallback = Object.freeze({ version: VERSION, started: false, completed: false, step: 0 });
  let state = { ...fallback };
  let loaded = false;
  let queue = Promise.resolve();

  function clean(value) {
    return {
      version: VERSION,
      started: Boolean(value?.started),
      completed: Boolean(value?.completed),
      step: Math.max(0, Math.min(9, Math.floor(Number(value?.step) || 0)))
    };
  }

  function unwrap(value) {
    return value && typeof value === 'object' && 'value' in value
      ? value.value
      : value;
  }

  async function load() {
    if (loaded) return { ...state };
    try {
      const kv = root.dzmm?.kv;
      if (typeof kv?.get === 'function') {
        const saved = unwrap(await kv.get(KEY));
        if (saved) state = clean(saved);
      } else {
        const storage = root.PlatformBridge?.getLocalStorage?.();
        const raw = storage?.getItem?.(KEY);
        if (raw) state = clean(JSON.parse(raw));
      }
    } catch (_) {
      // 引导不是核心存档，持久化不可用时仍允许玩家正常开始游戏。
    }
    loaded = true;
    return { ...state };
  }

  function save(next) {
    state = clean(next);
    loaded = true;
    queue = queue.then(async () => {
      try {
        const kv = root.dzmm?.kv;
        if (typeof kv?.put === 'function') {
          await kv.put(KEY, state);
          return;
        }
        root.PlatformBridge?.getLocalStorage?.()?.setItem(KEY, JSON.stringify(state));
      } catch (_) {
        // 引导状态保存失败不应打断游戏流程。
      }
    });
    return queue.then(() => ({ ...state }));
  }

  root.GameTutorialState = Object.freeze({ load, save, fallback });
}(window));
