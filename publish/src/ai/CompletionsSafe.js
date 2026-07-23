(function installCompletionsSafeRecipe(root) {
  'use strict';

function createCompletionsSafe({
  complete = null,
  dzmmRef = () => root.dzmm,
  getModel = () => 'default',
  timeoutMs = 60_000,
  timeoutFallback: defaultTimeoutFallback,
} = {}) {
  let requestSeq = 0;
  let cancelledSeq = 0;
  let paidInFlight = null;

  function normalizeTimeout(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(100, Math.min(120_000, Math.round(parsed)));
  }

  function createTimeoutError(deadlineMs) {
    const error = new Error(`AI 请求超过 ${deadlineMs}ms 未完成`);
    error.name = 'TimeoutError';
    error.code = 'TIMEOUT';
    return error;
  }

  function isTimeoutError(error) {
    return error?.code === 'TIMEOUT' || error?.name === 'TimeoutError';
  }

  function resolveTimeoutFallback(candidate, context) {
    if (candidate === undefined) return null;
    const value = typeof candidate === 'function' ? candidate(context) : candidate;
    if (typeof value !== 'string') throw new Error('timeoutFallback 必须是字符串或返回字符串的同步函数');
    return value;
  }

  const defaultTimeoutMs = normalizeTimeout(timeoutMs, 60_000);

  async function execute({
    messages,
    maxTokens = 1000,
    onUpdate,
    onDone,
    timeoutMs: runTimeoutMs = defaultTimeoutMs,
    timeoutFallback = defaultTimeoutFallback,
  } = {}, lock) {
    const seq = ++requestSeq;
    let finalText = '';
    let doneNotified = false;
    let acceptingUpdates = true;
    let transportStarted = false;
    let timer = null;
    const safeMessages = (messages || []).filter(m => m && (m.role === 'user' || m.role === 'assistant'));
    const deadlineMs = normalizeTimeout(runTimeoutMs, defaultTimeoutMs);
    const request = typeof complete === 'function'
      ? complete
      : (payload, onContent) => {
          const dzmm = dzmmRef();
          if (!dzmm?.completions) throw new Error('dzmm.completions 不可用');
          return dzmm.completions(payload, onContent);
        };

    const onContent = (text, done) => {
      if (!acceptingUpdates || doneNotified || seq <= cancelledSeq || seq !== requestSeq) return;
      // 浏览器 SDK 每次回调的是累计全文，必须覆盖而不是追加。
      finalText = typeof text === 'string' ? text : '';
      if (done) {
        doneNotified = true;
        onDone?.(finalText);
      } else {
        onUpdate?.(finalText);
      }
    };

    const requestPromise = Promise.resolve().then(async () => {
      const model = await getModel();
      // deadline、cancel 或更新请求可能在慢 getModel 期间发生；此时绝不能再启动付费 transport。
      if (!acceptingUpdates || seq <= cancelledSeq || seq !== requestSeq) {
        return { skipped: true };
      }
      transportStarted = true;
      return request({ model, messages: safeMessages, maxTokens }, onContent);
    });
    lock.transport = requestPromise;
    void requestPromise.then(
      () => { lock.settled = true; if (paidInFlight === lock) paidInFlight = null; },
      () => { lock.settled = true; if (paidInFlight === lock) paidInFlight = null; },
    );
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        acceptingUpdates = false;
        reject(createTimeoutError(deadlineMs));
      }, deadlineMs);
    });

    let response;
    try {
      response = await Promise.race([requestPromise, timeoutPromise]);
    } catch (error) {
      acceptingUpdates = false;
      if (seq <= cancelledSeq || seq !== requestSeq) {
        return { ignored: true, text: finalText, error };
      }
      if (!isTimeoutError(error)) throw error;
      // 模型选择阶段尚未启动付费 transport 时立即释放锁；迟到的 model
      // 会被 acceptingUpdates / seq 守卫拦住，且旧 promise 不能清掉新锁。
      if (!transportStarted && paidInFlight === lock) paidInFlight = null;

      const fallbackText = resolveTimeoutFallback(timeoutFallback, {
        error,
        messages: safeMessages,
        maxTokens,
        timeoutMs: deadlineMs,
        transportStarted,
      });
      if (fallbackText === null) throw error;
      finalText = fallbackText;
      onDone?.(finalText);
      return {
        ignored: false,
        text: finalText,
        source: 'fallback',
        reason: 'timeout',
        error,
      };
    } finally {
      acceptingUpdates = false;
      if (timer !== null) clearTimeout(timer);
    }

    if (seq <= cancelledSeq || seq !== requestSeq) return { ignored: true, text: finalText };
    const directText = typeof response === 'string'
      ? response
      : (typeof response?.text === 'string' ? response.text : response?.content);
    if (!finalText && typeof directText === 'string') finalText = directText;
    if (!doneNotified && finalText) onDone?.(finalText);
    return { ignored: false, text: finalText, source: 'ai', reason: 'completed' };
  }

  function run(options = {}) {
    if (paidInFlight) {
      return Promise.resolve({ ignored: true, text: '', source: 'busy', reason: 'busy' });
    }
    const lock = { settled: false, transport: null };
    paidInFlight = lock;
    let task;
    try {
      task = execute(options, lock);
    } catch (error) {
      if (paidInFlight === lock) paidInFlight = null;
      throw error;
    }
    return task.finally(() => {
      if (!lock.transport && paidInFlight === lock) paidInFlight = null;
    });
  }

  function cancel() {
    cancelledSeq = Math.max(cancelledSeq, requestSeq);
  }

  return {
    run,
    cancel,
    isBusy: () => Boolean(paidInFlight),
    isLatest: seq => seq === requestSeq && seq > cancelledSeq,
  };
}

  const recipes = root.GamefyRecipes || (root.GamefyRecipes = {});
  recipes.createCompletionsSafe = createCompletionsSafe;
}(typeof window !== 'undefined' ? window : globalThis));
