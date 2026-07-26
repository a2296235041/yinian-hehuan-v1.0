(function installAffinityState(root) {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  // 手动读档和自动存档共用同一套清洗规则，避免损坏数据绕过每日次数限制。
  function sanitize(value, limits) {
    const clean = { day: Math.max(1, Math.floor(Number(value?.day) || 1)), records: {} };
    Object.entries(value?.records || {}).slice(0, 50).forEach(([id, record]) => {
      if (!/^[a-z0-9_-]{1,64}$/i.test(id)) return;
      clean.records[id] = {
        affinity: clamp(record?.affinity, -100, limits.maxAffinity),
        dialogueDay: Math.max(0, Math.floor(Number(record?.dialogueDay) || 0)),
        dialogueGain: clamp(record?.dialogueGain, 0, limits.dialogueLimit),
        giftDay: Math.max(0, Math.floor(Number(record?.giftDay) || 0)),
        gifts: clamp(record?.gifts, 0, limits.giftLimit)
      };
    });
    return clean;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  root.GameAffinityState = Object.freeze({ sanitize, clone });
}(window));
