(function installVersionedStorageUtils(root) {
  'use strict';

  const PLATFORM_MAX_KV_BYTES = 5 * 1024 * 1024;
  function isPlainRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }
  function cloneJson(value) {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error('值无法序列化为 JSON');
    return JSON.parse(serialized);
  }
  function normalizeUpdatedAt(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && !value.trim()) return null;
    const timestamp = typeof value === 'number' ? value : Date.parse(value);
    if (!Number.isFinite(timestamp) || timestamp < 0) return null;
    try { return new Date(timestamp).toISOString(); } catch (_) { return null; }
  }
  function utf8Length(value) {
    if (typeof root.TextEncoder === 'function') return new root.TextEncoder().encode(value).byteLength;
    let bytes = 0;
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code < 0x80) bytes += 1;
      else if (code < 0x800) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
        bytes += 4;
        index += 1;
      } else bytes += 3;
    }
    return bytes;
  }
  function assertPersistable(value, options, path = 'data', seen = new Set()) {
    if (value === null) return;
    const type = typeof value;
    if (type === 'string') {
      if (options.rejectDataUrls && /^data:/i.test(value)) throw new Error(`${path} 不能保存 data URL`);
      return;
    }
    if (type === 'boolean') return;
    if (type === 'number') {
      if (!Number.isFinite(value)) throw new Error(`${path} 包含非有限数值`);
      return;
    }
    if (type !== 'object') throw new Error(`${path} 只能包含 JSON-safe 数据`);
    if ((typeof root.Blob === 'function' && value instanceof root.Blob)
      || (typeof root.File === 'function' && value instanceof root.File)) {
      throw new Error(`${path} 不能保存 Blob 或 File`);
    }
    if (seen.has(value)) throw new Error(`${path} 包含循环引用`);
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach((item, index) => assertPersistable(item, options, `${path}[${index}]`, seen));
    } else {
      if (!isPlainRecord(value)) throw new Error(`${path} 只能包含普通对象`);
      Object.entries(value).forEach(([key, item]) => assertPersistable(item, options, `${path}.${key}`, seen));
    }
    seen.delete(value);
  }
  function withDeadline(operation, timeoutMs) {
    if (typeof operation !== 'function') return Promise.resolve({ ok: false });
    let timer;
    return Promise.race([
      Promise.resolve().then(operation).then(
        value => ({ ok: true, value, timedOut: false }),
        error => ({ ok: false, error, timedOut: false }),
      ),
      new Promise(resolve => {
        timer = root.setTimeout(() => resolve({ ok: false, timedOut: true }), timeoutMs);
      }),
    ]).finally(() => root.clearTimeout(timer));
  }
  function readStorageCandidate(storageRef, key, decode) {
    try {
      const storage = storageRef();
      if (!storage || typeof storage.getItem !== 'function') return { ok: false };
      const raw = storage.getItem(key);
      return { ok: true, raw, value: raw === null ? null : decode(raw) };
    } catch (error) {
      return { ok: false, error, raw: null, value: null };
    }
  }
  function backendError(message, remoteError, localError) {
    return Object.assign(new Error(message), { remoteError, localError });
  }

  const recipes = root.GamefyRecipes || (root.GamefyRecipes = {});
  recipes.versionedStorageUtils = Object.freeze({
    PLATFORM_MAX_KV_BYTES,
    isPlainRecord,
    cloneJson,
    normalizeUpdatedAt,
    utf8Length,
    assertPersistable,
    withDeadline,
    readStorageCandidate,
    backendError,
  });
}(typeof window !== 'undefined' ? window : globalThis));
