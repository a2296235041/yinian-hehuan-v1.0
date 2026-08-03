(function installTournamentState(root) {
  'use strict';

  const EMPTY = Object.freeze({
    active: null,
    cooldowns: Object.freeze({ internal: 0, spirit: 0 }),
    history: Object.freeze([]),
    corruption: Object.freeze({})
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function sanitizeCorruption(value) {
    const clean = {};
    Object.entries(value || {}).slice(0, 50).forEach(([id, amount]) => {
      if (/^[a-z0-9_-]{1,64}$/i.test(id)) clean[id] = clamp(amount, 0, 100);
    });
    return clean;
  }

  function sanitize(value) {
    const source = isRecord(value) ? value : EMPTY;
    const active = isRecord(source.active) && ['internal', 'spirit'].includes(source.active.mode)
      ? clone(source.active)
      : null;
    return {
      active,
      cooldowns: {
        internal: clamp(source.cooldowns?.internal, 0, 999999),
        spirit: clamp(source.cooldowns?.spirit, 0, 999999)
      },
      history: Array.isArray(source.history) ? clone(source.history.slice(-12)) : [],
      corruption: sanitizeCorruption(source.corruption)
    };
  }

  root.GameTournamentState = Object.freeze({
    fresh: () => clone(EMPTY),
    clone,
    sanitize
  });
}(window));
