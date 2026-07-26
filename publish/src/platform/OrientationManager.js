(function installOrientationManager(root) {
  'use strict';

  let initialized = false;
  let preferred = 'landscape';
  let status;
  let buttons = [];
  let resizeFrame = 0;
  let resizeTimer = 0;
  let orientationQuery;
  let selecting = false;

  function currentOrientation() {
    const viewport = root.visualViewport;
    const width = Math.max(1, Number(viewport?.width) || root.innerWidth || 1);
    const height = Math.max(1, Number(viewport?.height) || root.innerHeight || 1);
    return width >= height ? 'landscape' : 'portrait';
  }

  /**
   * 手机旋转和进入全屏时，浏览器可能分几次更新可视区域。
   * 先在下一帧刷新，再延迟补一次，避免 Phaser 读到旧尺寸。
   */
  function runScaleRefresh() {
    const game = root.game;
    if (!game?.isBooted || !game.canvas || !game.scale) return;
    try {
      game.scale.refresh();
    } catch (error) {
      console.error('刷新游戏画布尺寸失败:', error.message, error.stack);
    }
  }

  function refreshGameScale() {
    if (resizeFrame) root.cancelAnimationFrame(resizeFrame);
    if (resizeTimer) root.clearTimeout(resizeTimer);
    resizeFrame = root.requestAnimationFrame(() => {
      resizeFrame = 0;
      runScaleRefresh();
    });
    resizeTimer = root.setTimeout(() => {
      resizeTimer = 0;
      runScaleRefresh();
    }, 240);
  }

  function render(message = '') {
    const actual = currentOrientation();
    document.documentElement.dataset.gameOrientation = preferred;
    buttons.forEach((button) => {
      const selected = button.dataset.orientation === preferred;
      button.setAttribute('aria-pressed', String(selected));
      button.disabled = selecting;
    });
    if (!status) {
      refreshGameScale();
      return;
    }
    if (message) {
      status.textContent = message;
    } else if (actual === preferred) {
      status.textContent = preferred === 'landscape' ? '横屏已适配' : '竖屏已适配';
    } else {
      status.textContent = preferred === 'landscape'
        ? '请横向旋转手机'
        : '请竖向旋转手机';
    }
    refreshGameScale();
  }

  /**
   * Android 浏览器通常要求先进入全屏，才能锁定屏幕方向。
   * 平台或 iOS 不支持时退回手动旋转，所有受限 API 都在 try-catch 内执行。
   */
  async function select(next) {
    if (selecting) return;
    preferred = next === 'portrait' ? 'portrait' : 'landscape';
    render();
    if (currentOrientation() === preferred) return;
    selecting = true;
    render(preferred === 'landscape' ? '正在切换横屏…' : '正在切换竖屏…');
    let locked = false;
    try {
      const page = document.documentElement;
      if (!document.fullscreenElement && typeof page.requestFullscreen === 'function') {
        try {
          await page.requestFullscreen({ navigationUI: 'hide' });
        } catch (error) {
          console.info('平台未允许子页面进入全屏:', error.message || '权限受限');
        }
      }
      const orientation = root.screen && root.screen.orientation;
      if (typeof orientation?.lock === 'function') {
        await orientation.lock(preferred);
        locked = true;
      }
    } catch (error) {
      console.info('浏览器未允许自动切换方向:', error.message || '权限受限');
    } finally {
      selecting = false;
      if (locked || currentOrientation() === preferred) {
        render();
      } else {
        render(preferred === 'landscape'
          ? '请进入全屏并横向旋转'
          : '请进入全屏并竖向旋转');
      }
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
      button.addEventListener('click', () => {
        select(button.dataset.orientation).catch((error) => {
          selecting = false;
          console.error('切换显示方向失败:', error.message, error.stack);
          render('方向切换失败，请手动旋转');
        });
      });
    });
    root.addEventListener('resize', handleResize);
    root.addEventListener('orientationchange', handleResize);
    root.visualViewport?.addEventListener?.('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);
    orientationQuery = root.matchMedia?.('(orientation: landscape)');
    orientationQuery?.addEventListener?.('change', handleResize);
    root.game?.events?.once?.('ready', handleResize);
    render();
  }

  root.GameOrientation = {
    init,
    select,
    getPreferred: () => preferred
  };
}(window));
