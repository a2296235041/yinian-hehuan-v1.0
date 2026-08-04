(function installPlatformBridge(root) {
  'use strict';

  let bootComplete = false;
  let failed = false;
  let playerProfilePromise = null;

  function callLoading(method, ...args) {
    try {
      const loading = root.dzmm && root.dzmm.loading;
      if (loading && typeof loading[method] === 'function') {
        loading[method](...args);
      }
    } catch (error) {
      console.error('平台加载状态上报失败:', error.message, error.stack);
    }
  }

  function progress(payload) {
    if (failed || bootComplete) return;
    const pulse = root.GameBootPulse;
    if (pulse && typeof pulse.progress === 'function') {
      pulse.progress(payload);
      return;
    }
    callLoading('progress', payload);
  }

  function ready() {
    if (failed || bootComplete) return;
    bootComplete = true;
    root.GameBootPulse?.stop?.();
    root.GameEarlyBoot?.complete?.();
    callLoading('ready');
  }

  function fail(code, message) {
    if (failed || bootComplete) return;
    failed = true;
    root.GameBootPulse?.stop?.();
    const safeMessage = message || '游戏启动失败';
    root.GameEarlyBoot?.fail?.(safeMessage, code || 'BOOT_FAILED');
    callLoading('error', code || 'BOOT_FAILED', safeMessage);

    const panel = document.getElementById('boot-error');
    const text = document.getElementById('boot-error-message');
    if (text) text.textContent = `${safeMessage}，请刷新后重试。`;
    if (panel) panel.hidden = false;
  }

  /**
   * 平台 iframe 的 origin 为 null，直接读取 localStorage 会触发 SecurityError。
   * 仅在游戏被放到普通同源页面运行时，才允许把它作为非平台环境的降级存储。
   */
  function getLocalStorage() {
    if (root.dzmm) return null;
    try {
      return root.localStorage;
    } catch (_) {
      return null;
    }
  }

  function isOpaqueCrossOriginError(event) {
    const message = String(event.message || '').trim();
    return !event.error
      && Number(event.lineno || 0) === 0
      && Number(event.colno || 0) === 0
      && (!event.filename || /^script error\.?$/i.test(message));
  }

  function safeAvatarUrl(value) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) return '';
    try {
      const url = new URL(text);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  // 只暴露界面需要的昵称和头像地址，绝不把平台返回的 token 放入游戏状态或日志。
  async function getPlayerProfile() {
    if (playerProfilePromise) return playerProfilePromise;
    playerProfilePromise = Promise.resolve()
      .then(async () => {
        const infoApi = root.dzmm?.user?.info;
        if (typeof infoApi !== 'function') {
          return { name: '', avatarUrl: '' };
        }
        const info = await infoApi();
        return {
          name: typeof info?.name === 'string' ? info.name.trim().slice(0, 24) : '',
          avatarUrl: safeAvatarUrl(info?.avatarUrl)
        };
      })
      .catch((error) => {
        console.error('读取玩家资料失败:', error.code || '', error.message, error.stack);
        return { name: '', avatarUrl: '' };
      });
    return playerProfilePromise;
  }

  root.addEventListener('error', (event) => {
    if (isOpaqueCrossOriginError(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const message = event.error?.message || event.message || '未知脚本错误';
    console.error('游戏脚本错误:', message, event.error?.stack || '');
    fail('SCRIPT_ERROR', message);
  });

  root.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || String(reason || '未知异步错误');
    console.error('游戏异步错误:', reason?.code || '', message, reason?.stack || '');
    fail('UNHANDLED_REJECTION', message);
  });

  root.PlatformBridge = { progress, ready, fail, getPlayerProfile, getLocalStorage };
  progress({ phase: 'start', message: '正在准备游戏' });
}(window));
