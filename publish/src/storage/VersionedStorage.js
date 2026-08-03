(function installVersionedStorageRecipe(root) {
  'use strict';
  const recipes = root.GamefyRecipes || (root.GamefyRecipes = {}); const utils = recipes.versionedStorageUtils;
  if (!utils) throw new Error('请先加载 versioned-storage-utils.js');
  const { PLATFORM_MAX_KV_BYTES, isPlainRecord, cloneJson, normalizeUpdatedAt, utf8Length,
    assertPersistable, withDeadline, createSettlementGate, readStorageCandidate, backendError } = utils;
  function createVersionedStorage(options = {}) {
    const namespace = String(options.namespace || 'game:');
    const key = String(options.key || '').trim();
    const version = Number(options.version);
    const fallback = options.fallback === undefined ? null : options.fallback;
    const migrations = isPlainRecord(options.migrations) ? options.migrations : {};
    const sanitize = typeof options.sanitize === 'function' ? options.sanitize : value => value;
    const dzmmRef = typeof options.dzmmRef === 'function' ? options.dzmmRef : () => root.dzmm;
    const localStorageRef = typeof options.localStorageRef === 'function' ? options.localStorageRef : () => root.PlatformBridge?.getLocalStorage?.();
    const readTimeoutMs = Math.max(100, Math.min(30000, Number(options.readTimeoutMs) || 10000));
    const writeTimeoutMs = Math.max(100, Math.min(30000, Number(options.writeTimeoutMs) || 15000));
    const maxBytes = Math.min(PLATFORM_MAX_KV_BYTES, Math.max(1024, Number(options.maxBytes) || 512 * 1024));
    const safety = { rejectDataUrls: options.rejectDataUrls !== false };
    const localKey = String(options.localKey || `dzmm:${namespace}${key}`);
    let remoteWriteQueue = Promise.resolve(); const remoteWriteGate = createSettlementGate(writeTimeoutMs);
    let mutationGeneration = 0;
    let currentEnvelope = null;
    if (!key) throw new Error('versioned-storage 需要非空 key');
    if (!Number.isInteger(version) || version < 1) throw new Error('version 必须是正整数');
    if (`${namespace}${key}`.length > 256) throw new Error('namespace 与 key 合计不能超过 256 字符');
    function normalizeCurrent(value) {
      assertPersistable(value, safety);
      const clean = sanitize(cloneJson(value));
      assertPersistable(clean, safety);
      const serialized = JSON.stringify(clean);
      if (utf8Length(serialized) > maxBytes) throw new Error(`存储数据超过 ${maxBytes} 字节预算`);
      return cloneJson(clean);
    }
    function makeEnvelope(value, updatedAt = new Date().toISOString()) {
      const normalizedUpdatedAt = normalizeUpdatedAt(updatedAt);
      if (!normalizedUpdatedAt) throw new Error('updatedAt 必须是有效时间');
      const envelope = { schemaVersion: version, updatedAt: normalizedUpdatedAt, data: normalizeCurrent(value) };
      if (utf8Length(JSON.stringify(envelope)) > maxBytes) {
        throw new Error(`存储 envelope 超过 ${maxBytes} 字节预算`);
      }
      return envelope;
    }
    function decodeCandidate(rawValue, serialized = false) {
      // get()/getItem() 返回 null 表示明确 miss，不是可交给 migrations[0] 的旧版裸数据。
      if (rawValue == null) return null;
      try {
        let value = rawValue;
        if (serialized) value = JSON.parse(value);
        let fromVersion = 0;
        let updatedAt = new Date(0).toISOString();
        let data = value;
        if (isPlainRecord(value)
          && Number.isInteger(value.schemaVersion)
          && Object.prototype.hasOwnProperty.call(value, 'data')) {
          fromVersion = value.schemaVersion;
          updatedAt = normalizeUpdatedAt(value.updatedAt);
          // envelope 声明了 updatedAt 就必须合法，不能把损坏时间悄悄降成 epoch。
          if (!updatedAt) return null;
          data = value.data;
        }
        if (fromVersion < 0 || fromVersion > version) return null;
        while (fromVersion < version) {
          const migrate = migrations[fromVersion];
          if (typeof migrate !== 'function') return null;
          data = migrate(cloneJson(data));
          fromVersion += 1;
        }
        return makeEnvelope(data, updatedAt);
      } catch (_) {
        return null;
      }
    }
    function readLocal() { return readStorageCandidate(localStorageRef, localKey, raw => decodeCandidate(raw, true)); }
    function writeLocal(envelope) {
      try {
        localStorageRef().setItem(localKey, JSON.stringify(envelope));
        return true;
      } catch (_) {
        return false;
      }
    }
    function removeLocal() {
      try {
        const storage = localStorageRef(); storage.removeItem(localKey);
        return storage.getItem(localKey) === null;
      } catch (_) { return false; }
    }
    function remoteTarget() {
      try {
        const kv = dzmmRef()?.kv;
        if (!kv) return null;
        if (namespace && typeof kv.namespace === 'function') return { store: kv.namespace(namespace), key };
        return { store: kv, key: `${namespace}${key}` };
      } catch (_) {
        return null;
      }
    }
    function unwrapRemote(value) {
      if (isPlainRecord(value) && Object.prototype.hasOwnProperty.call(value, 'value')) return { value: value.value, miss: value.value === null && value.updated_at == null };
      return { value, miss: value == null };
    }
    async function readRemote(target) {
      if (!target || typeof target.store?.get !== 'function') return { ok: false };
      return withDeadline(() => target.store.get(target.key), readTimeoutMs);
    }
    function queueRemoteMutation(operation) {
      const pending = remoteWriteQueue.then(() => Promise.resolve().then(operation));
      remoteWriteQueue = pending.then(() => undefined, () => undefined);
      return pending;
    }
    async function awaitRemoteMutation(operation) {
      const result = await withDeadline(() => operation, writeTimeoutMs);
      if (result.timedOut) remoteWriteGate.mark(operation);
      return result;
    }
    function queueRemoteSave(target, envelope, flush) {
      if (!target || typeof target.store?.put !== 'function') {
        return Promise.resolve({ ok: false });
      }
      // 初始化、保存和清空共用一个队列，调用方超时也不会让同 key 的远端变更重叠。
      const operation = queueRemoteMutation(
        () => target.store.put(target.key, envelope, { flush: flush === true }),
      );
      return awaitRemoteMutation(operation);
    }
    function queueRemoteDelete(target) {
      if (!target || typeof target.store?.delete !== 'function') {
        return Promise.resolve({ ok: false });
      }
      const operation = queueRemoteMutation(() => target.store.delete(target.key));
      return awaitRemoteMutation(operation);
    }
    async function load() {
      const loadGeneration = mutationGeneration;
      const localCurrent = () => currentEnvelope || readLocal().value;
      try {
        await remoteWriteGate.wait('上一次远端写入仍在处理中，请稍后重试');
      } catch (error) {
        const current = localCurrent();
        if (!current) throw error;
        return cloneJson(current.data);
      }
      const writesBeforeLoad = remoteWriteQueue;
      const queueWait = await withDeadline(() => writesBeforeLoad, writeTimeoutMs);
      if (queueWait.timedOut) {
        remoteWriteGate.mark(writesBeforeLoad);
        const current = localCurrent();
        if (!current) throw new Error('等待远端写入超时，且没有有效本地副本');
        return cloneJson(current.data);
      }
      if (loadGeneration !== mutationGeneration) {
        return cloneJson((localCurrent() || makeEnvelope(fallback)).data);
      }
      const target = remoteTarget();
      const localRead = readLocal();
      const [localEnvelope, remoteRead] = await Promise.all([
        Promise.resolve(localRead.value), readRemote(target),
      ]);
      const remote = remoteRead.ok ? unwrapRemote(remoteRead.value) : { value: null, miss: false };
      const remoteEnvelope = remoteRead.ok && !remote.miss ? decodeCandidate(remote.value, false) : null;
      const remoteMiss = remoteRead.ok && remote.miss;
      const noKnownState = target ? !remoteEnvelope && !remoteMiss && !localEnvelope : !localEnvelope && !localRead.ok;
      if (noKnownState) throw backendError('读取存档失败：远端 KV 不可用且没有有效本地副本', remoteRead.error, localRead.error);
      const selected = remoteEnvelope || localEnvelope || makeEnvelope(fallback);
      // load 等待远端期间如果发生了 save/clear，旧快照不能再覆盖本地或排队初始化远端。
      if (loadGeneration !== mutationGeneration) {
        return cloneJson((localCurrent() || makeEnvelope(fallback)).data);
      }
      currentEnvelope = selected;
      writeLocal(selected);
      if (target && remoteMiss) void queueRemoteSave(target, selected, false);
      return cloneJson(selected.data);
    }
    async function save(value, saveOptions = {}) {
      await remoteWriteGate.wait('上一次远端写入仍在处理中，请稍后重试');
      const envelope = makeEnvelope(value);
      mutationGeneration += 1;
      currentEnvelope = envelope;
      writeLocal(envelope);
      const remote = await queueRemoteSave(remoteTarget(), envelope, saveOptions.flush === true);
      return { value: cloneJson(envelope.data), remote: remote.ok };
    }
    async function clear() {
      await remoteWriteGate.wait('上一次远端写入仍在处理中，请稍后重试');
      const localRead = readLocal(); const localBackup = currentEnvelope || localRead.value; const target = remoteTarget();
      if (!removeLocal() && (localRead.ok || !target)) throw new Error('本地删除未确认，远端未改动并取消清空');
      const clearGeneration = ++mutationGeneration; currentEnvelope = null;
      const remote = await queueRemoteDelete(target);
      if (target && !remote.ok) {
        if (mutationGeneration !== clearGeneration) throw new Error('远端删除未确认；已保留并发产生的较新本地状态');
        const restored = localBackup ? writeLocal(localBackup) : false; if (!restored) { currentEnvelope = localBackup; throw new Error('远端删除未确认且本地副本恢复失败；请刷新后重试'); }
        currentEnvelope = localBackup; throw new Error('远端删除未确认，已恢复本地副本并取消清空');
      }
      return { remote: remote.ok };
    }
    return Object.freeze({ load, save, clear });
  }
  recipes.createVersionedStorage = createVersionedStorage;
}(typeof window !== 'undefined' ? window : globalThis));
