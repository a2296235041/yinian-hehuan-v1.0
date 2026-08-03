(function installAiJson(root) {
  'use strict';

  const recipes = root.GamefyRecipes || (root.GamefyRecipes = {});

  function createAiJson(options = {}) {
    const validate = options.validate;
    const transport = options.completions || recipes.createCompletionsSafe?.();
    if (typeof validate !== 'function') throw new Error('createAiJson 需要 validate 函数');
    if (!transport?.run) throw new Error('AI JSON 缺少 completions transport');
    const forbidden = new Set(['__proto__', 'constructor', 'prototype']);

    function normalize(value, seen = new Set()) {
      if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) throw new Error('AI JSON 包含非有限数值');
        return value;
      }
      if (!value || typeof value !== 'object' || seen.has(value)) {
        throw new Error('AI JSON 不是可安全复制的数据');
      }
      if (Object.getOwnPropertySymbols(value).length) throw new Error('AI JSON 包含 Symbol');
      seen.add(value);
      if (Array.isArray(value)) {
        const output = [];
        for (let index = 0; index < value.length; index += 1) {
          if (!Object.prototype.hasOwnProperty.call(value, index)) {
            throw new Error('AI JSON 不能包含稀疏数组');
          }
          output.push(normalize(value[index], seen));
        }
        seen.delete(value);
        return output;
      }
      const proto = Object.getPrototypeOf(value);
      if (proto !== null && proto !== Object.prototype && Object.getPrototypeOf(proto) !== null) {
        throw new Error('AI JSON 只能包含普通对象');
      }
      const output = Object.create(null);
      Object.getOwnPropertyNames(value).forEach((key) => {
        if (forbidden.has(key)) throw new Error(`AI JSON 包含危险键：${key}`);
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor?.enumerable || !('value' in descriptor)) {
          throw new Error(`AI JSON 包含非法字段：${key}`);
        }
        output[key] = normalize(descriptor.value, seen);
      });
      seen.delete(value);
      return output;
    }

    function fallback(candidate, context) {
      const source = typeof candidate === 'function' ? candidate(context) : candidate;
      const value = normalize(source);
      if (!validate(value)) throw new Error('AI JSON fallback 未通过校验');
      return {
        ignored: false,
        value,
        source: 'fallback',
        reason: context.reason,
        error: context.error
      };
    }

    function parseJson(rawText) {
      const source = String(rawText || '').replace(/^\uFEFF/, '').trim();
      const fenced = source.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
      const candidate = (fenced ? fenced[1] : source).trim();
      try {
        return JSON.parse(candidate);
      } catch (originalError) {
        const start = candidate.indexOf('{');
        const end = candidate.lastIndexOf('}');
        if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1));
        throw originalError;
      }
    }

    async function generate(request = {}) {
      const prompt = [
        String(request.instructions || '').trim(),
        '',
        '只返回合法 JSON，不要 Markdown 代码围栏。',
        '',
        String(request.userText || '').trim()
      ].join('\n');
      let result;
      try {
        result = await transport.run({
          maxTokens: options.maxTokens || 1200,
          messages: [{ role: 'user', content: prompt }]
        });
      } catch (error) {
        return fallback(request.fallback ?? options.fallback, {
          reason: 'request_failed',
          error
        });
      }
      if (result.ignored) {
        return { ignored: true, value: null, source: 'ignored', reason: result.reason || 'stale' };
      }
      let parsed;
      try {
        parsed = normalize(parseJson(result.text));
      } catch (error) {
        return fallback(request.fallback ?? options.fallback, {
          reason: result.source === 'fallback' ? result.reason : 'invalid_json',
          error
        });
      }
      if (!validate(parsed)) {
        return fallback(request.fallback ?? options.fallback, {
          reason: result.source === 'fallback' ? result.reason : 'invalid_schema'
        });
      }
      return {
        ignored: false,
        value: parsed,
        source: result.source === 'fallback' ? 'fallback' : 'ai',
        reason: result.reason || 'generated',
        error: result.error
      };
    }

    return { generate, cancel: () => transport.cancel?.() };
  }

  recipes.createAiJson = createAiJson;
}(window));
