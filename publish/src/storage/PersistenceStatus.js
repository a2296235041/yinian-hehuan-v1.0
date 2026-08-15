(function installPersistenceStatus(root) {
  'use strict';

  const WARNING_GAP_MS = 1800;
  let lastWarningKey = '';
  let lastWarningAt = 0;

  function result(operation, changed, durable, extra = {}) {
    const didChange = changed === true;
    const isDurable = durable === true;
    const localOnly = !isDurable;
    return {
      ...extra,
      changed: didChange,
      durable: isDurable,
      syncState: localOnly ? 'local_only' : 'synced',
      syncMessage: localOnly
        ? `${operation || '本次操作'}已在本地变更，但尚未同步到线上，请稍后重试`
        : ''
    };
  }

  function combine(operation, results, extra = {}) {
    const list = Array.isArray(results) ? results.filter(Boolean) : [];
    const changed = list.some((entry) => entry.changed === true);
    const durable = list.every((entry) => entry.durable !== false);
    return result(operation, changed, durable, extra);
  }

  function report(operation, value) {
    if (!value || value.durable !== false) return value;
    const payload = {
      operation: operation || '本次操作',
      ...value
    };
    const now = Date.now();
    const warningKey = `${payload.operation}:${payload.syncMessage}`;
    if (warningKey !== lastWarningKey || now - lastWarningAt >= WARNING_GAP_MS) {
      lastWarningKey = warningKey;
      lastWarningAt = now;
      root.Game?.EventBus?.emit?.('persistence-sync-warning', payload);
      try {
        root.dzmm?.toast?.warning?.(payload.syncMessage);
      } catch (error) {
        console.error('同步提示显示失败:', error.code || '', error.message, error.stack);
      }
    }
    return value;
  }

  root.GamePersistenceStatus = Object.freeze({ result, combine, report });
}(window));
