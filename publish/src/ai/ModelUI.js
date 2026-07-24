(function installModelUI(root) {
  'use strict';

  // 设置面板已移除，保留兼容 API，避免旧场景调用导致启动失败。
  root.GameModelUI = {
    init() {},
    setMode() {},
    close() {}
  };
}(window));
