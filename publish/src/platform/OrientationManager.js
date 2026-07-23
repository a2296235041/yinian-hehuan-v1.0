(function installOrientationManager(root) {
  'use strict';

  let initialized = false;
  let preferred = 'landscape';
  let status;
  let buttons = [];
  let resizeFrame = 0;

  function currentOrientation() {
    const type = root.screen?.orientation?.type || '';
    if (type.startsWith('portrait')) return 'portrait';
    if (type.startsWith('landscape')) return 'landscape';
    return root.innerWidth >= root.innerHeight ? 'landscape' : 'portrait';
  }

  /**
   * Phaser 使用 FIT 缩放。手机旋转后主动刷新 ScaleManager，
   * 避免画布继续沿用旋转前的尺寸而出现留白、裁切或点击坐标偏移。
   */
  function refreshGameScale() {
    if (resizeFrame) root.cancelAnimationFrame(resizeFrame);
    resizeFrame = root.requestAnimationFrame(() => {
      resizeFrame = 0;
      root.game?.scale?.refresh?.();
    });
  }

  function render(message = '') {
    const actual = currentOrientation();
    document.documentElement.dataset.gameOrientation = preferred;
    buttons.forEach((button) => {
      const selected = button.dataset.orientation === preferred;
      button.setAttribute('aria-pressed', String(selected));
    });
    if (message) {
      status.textContent = message;
    } else if (actual === preferred) {
      status.textContent = preferred === 'landscape' ? '当前为横屏布局' : '当前为竖屏布局';
    } else {
      status.textContent = preferred === 'landscape'
        ? '请将手机横向旋转'
        : '请将手机竖向旋转';
    }
    refreshGameScale();
  }

  /**
   * 屏幕锁定接口在部分 iframe 或非全屏浏览器中会被拒绝。
   * 失败时保留响应式布局并提示手动旋转，不让设置操作导致脚本异常。
   */
  async function select(next) {
    preferred = next === 'portrait' ? 'portrait' : 'landscape';
    render();
    const orientation = root.screen?.orientation;
    if (typeof orientation?.lock !== 'function') return;
    try {
      await orientation.lock(preferred);
      render();
    } catch (_) {
      render(preferred === 'landscape' ? '请手动横向旋转手机' : '请手动竖向旋转手机');
    }
  }

  function handleResize() {
    render();
  }

  function init() {
    if (initialized) return;
    initialized = true;
    status = document.getElementById('orientation-status');
    buttons = Array.from(document.querySelectorAll('.orientation-segment [data-orientation]'));
    preferred = currentOrientation();
    buttons.forEach((button) => {
      button.addEventListener('click', () => select(button.dataset.orientation));
    });
    root.addEventListener('resize', handleResize);
    root.addEventListener('orientationchange', handleResize);
    root.screen?.orientation?.addEventListener?.('change', handleResize);
    render();
  }

  root.GameOrientation = {
    init,
    select,
    getPreferred: () => preferred
  };
}(window));
