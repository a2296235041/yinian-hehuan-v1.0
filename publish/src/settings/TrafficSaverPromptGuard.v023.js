(function installTrafficSaverPromptGuard(root) {
  'use strict';

  const scene = root.Game?.Scenes?.UIScene;
  const originalShowLog = scene?.prototype?.showLog;
  if (typeof originalShowLog !== 'function') return;

  scene.prototype.showLog = function showLog(message) {
    const text = String(message || '');
    const saver = root.GameTrafficSaver;
    const cultivationPrompt = text.includes('AI 正在补全修炼片段');
    const sectPrompt = text.includes('AI 正在续写宗门');
    if (cultivationPrompt && saver?.isEnabled?.('cultivation')) return;
    if (sectPrompt && saver?.isEnabled?.('cultivation')) return;
    return originalShowLog.call(this, message);
  };
}(window));
