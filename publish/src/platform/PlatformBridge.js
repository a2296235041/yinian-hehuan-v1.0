(function installPlatformBridge(root) {
  'use strict';

  let bootComplete = false;
  let failed = false;

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
    if (!failed && !bootComplete) callLoading('progress', payload);
  }

  function ready() {
    if (failed || bootComplete) return;
    bootComplete = true;
    callLoading('ready');
  }

  function fail(code, message) {
    if (failed || bootComplete) return;
    failed = true;
    const safeMessage = message || '游戏启动失败';
    callLoading('error', code || 'BOOT_FAILED', safeMessage);

    const panel = document.getElementById('boot-error');
    const text = document.getElementById('boot-error-message');
    if (text) text.textContent = `${safeMessage}，请刷新后重试。`;
    if (panel) panel.hidden = false;
  }

  root.addEventListener('error', (event) => {
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

  root.PlatformBridge = { progress, ready, fail };
  progress({ phase: 'start', message: '正在准备游戏' });
}(window));
