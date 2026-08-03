(function installTrafficSaver(root) {
  'use strict';

  const FEATURES = ['cultivation', 'exploration', 'battle'];
  const DEFAULT_STATE = Object.freeze({
    enabled: false,
    features: Object.freeze({
      cultivation: true,
      exploration: true,
      battle: true
    })
  });
  const FIXED_TEXTS = Object.freeze({
    cultivation: Object.freeze([
      '你收敛心神，引灵气沿经脉平稳运转，完成了一轮扎实吐纳。',
      '洞府内气息渐静，你依照功法周天行气，将灵力稳稳纳入丹田。',
      '你调整呼吸，守住灵台清明，让汇聚的灵气一点点沉入根基。',
      '功法运转顺畅，你在短暂入定后缓缓收功，周身气机更为凝实。',
      '你循序炼化四周灵气，没有冒进，这次修炼平稳结束。'
    ]),
    exploration: Object.freeze([
      '你放慢脚步观察四周，确认眼前动静后继续向前探索。',
      '山风掠过衣袖，你收敛气息，将沿途线索逐一记下。',
      '附近灵机轻轻波动，你谨慎查探，很快看清了这次遭遇。',
      '你避开危险地势，在周围搜寻片刻，眼前结果已经明朗。',
      '四周暂时没有新的异动，你整理发现，准备决定下一步行动。'
    ]),
    battle: Object.freeze([
      '双方气机正面碰撞，你稳住身形，战局仍在继续。',
      '兵刃与灵力交错而过，你迅速调整架势，盯紧对手破绽。',
      '这一击落定后，双方短暂拉开距离，重新判断彼此状态。',
      '战场灵气震荡，你守住要害，并准备接续下一次行动。',
      '攻防转瞬完成，你没有放松警惕，胜负仍待下一招分晓。'
    ])
  });

  const storage = root.GamefyRecipes.createVersionedStorage({
    namespace: 'yinian:',
    key: 'traffic-saver',
    version: 1,
    fallback: DEFAULT_STATE,
    sanitize
  });
  const listeners = new Set();
  const cursors = { cultivation: 0, exploration: 0, battle: 0 };
  let state = sanitize(DEFAULT_STATE);
  let readyPromise = null;

  function sanitize(value) {
    const source = value && typeof value === 'object' ? value : {};
    const featureSource = source.features && typeof source.features === 'object'
      ? source.features : {};
    return {
      enabled: source.enabled === true,
      features: FEATURES.reduce((result, feature) => {
        result[feature] = featureSource[feature] !== false;
        return result;
      }, {})
    };
  }

  function snapshot() {
    return {
      enabled: state.enabled,
      features: { ...state.features }
    };
  }

  function notify() {
    const next = snapshot();
    listeners.forEach((listener) => listener(next));
  }

  function init() {
    if (readyPromise) return readyPromise;
    readyPromise = storage.load()
      .then((saved) => {
        state = sanitize(saved);
        notify();
        return snapshot();
      })
      .catch((error) => {
        console.error('省流设置读取失败:', error.code || '', error.message, error.stack);
        notify();
        return snapshot();
      });
    return readyPromise;
  }

  async function persist(nextState) {
    state = sanitize(nextState);
    notify();
    const result = await storage.save(state, { flush: true });
    return { state: snapshot(), remote: result.remote === true };
  }

  root.GameTrafficSaver = {
    init,
    whenReady: init,
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    isEnabled(feature) {
      return state.enabled && state.features[feature] === true;
    },
    isActive() {
      return state.enabled;
    },
    featureForNarrative(kind) {
      if (kind === 'cultivation') return 'cultivation';
      if (kind === 'battle_action' || kind === 'battle_end') return 'battle';
      if (kind === 'exploration' || kind === 'npc_encounter') return 'exploration';
      return null;
    },
    nextText(feature) {
      const texts = FIXED_TEXTS[feature] || ['事情平稳结束。'];
      const index = cursors[feature] || 0;
      cursors[feature] = (index + 1) % texts.length;
      return texts[index % texts.length];
    },
    getTexts(feature) {
      return (FIXED_TEXTS[feature] || []).slice();
    },
    setEnabled(enabled) {
      return persist({ ...state, enabled: enabled === true });
    },
    setFeature(feature, enabled) {
      if (!FEATURES.includes(feature)) return Promise.resolve({ state: snapshot(), remote: false });
      return persist({
        ...state,
        features: { ...state.features, [feature]: enabled === true }
      });
    },
    getState: snapshot
  };
}(window));
