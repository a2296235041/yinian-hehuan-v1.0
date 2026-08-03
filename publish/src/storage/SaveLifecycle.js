(function installSaveLifecycle(root) {
  'use strict';

  let initialized = false;

  function init() {
    if (initialized) return;
    const saveApi = root.dzmm?.save;
    if (typeof saveApi?.onAction !== 'function') return;
    initialized = true;

    saveApi.onAction(async (request) => {
      const action = request?.action;
      if (action !== 'reset' && action !== 'prepareDeleteRecord') {
        return { ok: false, code: 'unsupported', message: '不支持的存档操作' };
      }
      try {
        await root.GameSave.clearAllOwnedData();
        return action === 'reset' ? { ok: true, reload: true } : { ok: true };
      } catch (error) {
        console.error('清理游戏存档失败:', error.code || '', error.message, error.stack);
        return {
          ok: false,
          code: 'clear_failed',
          message: '存档清理失败，请稍后重试'
        };
      }
    });
  }

  root.GameSaveLifecycle = Object.freeze({ init });
}(window));
