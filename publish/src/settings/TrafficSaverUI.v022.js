(function installTrafficSaverUI(root) {
  'use strict';

  const FEATURES = ['cultivation', 'exploration', 'battle'];
  let initialized = false;
  let mainToggle;
  let mainState;
  let options;
  let status;
  const toggles = {};
  const states = {};

  function featureLabel(state, feature) {
    if (!state.enabled) return state.features[feature] ? '随主开关启用' : '保持 AI 生成';
    return state.features[feature] ? '固定文案，不调用 AI' : '使用 AI 生成';
  }

  function render(state) {
    mainToggle.checked = state.enabled;
    mainState.textContent = state.enabled ? '已开启，可分别设置' : '已关闭，使用 AI 补充';
    options.setAttribute('aria-disabled', String(!state.enabled));
    FEATURES.forEach((feature) => {
      toggles[feature].checked = state.features[feature];
      toggles[feature].disabled = !state.enabled;
      states[feature].textContent = featureLabel(state, feature);
    });
  }

  async function save(action) {
    status.textContent = '正在保存省流设置…';
    try {
      const result = await action();
      status.textContent = result.remote
        ? '省流设置已保存'
        : '设置已在本次会话生效';
    } catch (error) {
      console.error('省流设置保存失败:', error.code || '', error.message, error.stack);
      status.textContent = '保存失败，本次会话仍按当前选择运行';
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    mainToggle = document.getElementById('traffic-saver-toggle');
    mainState = document.getElementById('traffic-saver-state');
    options = document.getElementById('traffic-saver-options');
    status = document.getElementById('traffic-saver-status');
    FEATURES.forEach((feature) => {
      toggles[feature] = document.getElementById(`traffic-${feature}-toggle`);
      states[feature] = document.getElementById(`traffic-${feature}-state`);
    });

    mainToggle.addEventListener('change', () => {
      void save(() => root.GameTrafficSaver.setEnabled(mainToggle.checked));
    });
    FEATURES.forEach((feature) => {
      toggles[feature].addEventListener('change', () => {
        void save(() => root.GameTrafficSaver.setFeature(feature, toggles[feature].checked));
      });
    });
    root.GameTrafficSaver.subscribe(render);
  }

  root.GameTrafficSaverUI = { init };
}(window));
