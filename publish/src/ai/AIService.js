(function installAIService(root) {
  'use strict';
  const openingCache = new Map();
  let current = null;
  let draft = '';
  const completions = root.GamefyRecipes.createCompletionsSafe({
    getModel: async () => {
      await root.GameAIModels.whenReady();
      return root.GameAIModels.getDialogueModel();
    },
    timeoutMs: 60_000,
    timeoutFallback: '她沉默片刻，似乎正在斟酌接下来该说什么。'
  });
  function affinityFor(session) {
    return root.GameAffinity.getSnapshot(session.npc.id);
  }
  function emitRender() {
    if (!current) return;
    root.Game.EventBus.emit('ai-dialogue-render', {
      npcName: current.npc.name,
      npcTitle: current.npc.title,
      messages: current.messages.slice(),
      draft
    });
  }
  function emitStatus(state, message) {
    root.Game.EventBus.emit('ai-dialogue-status', { state, message });
  }
  function errorMessage(error) {
    const code = error?.code;
    if (code === 'RATE_LIMITED') return '请求太频繁，请稍后再次点击。';
    if (code === 'QUOTA_EXHAUSTED') return '积分或今日对话额度不足。';
    if (code === 'VIP_REQUIRED') return '当前对话模型需要 VIP 权限。';
    if (['UNAUTHORIZED', 'TOKEN_EXPIRED', 'FORBIDDEN'].includes(code)) {
      return '登录状态已失效，请重新进入游戏。';
    }
    if (code === 'SENSITIVE_CONTENT_DETECTED') return '请换一种表达后再试。';
    return error?.message || 'DZMM 对话暂时不可用，请稍后再试。';
  }
  function applyOpening(session, text) {
    if (current !== session || session.messages.length) return;
    const opening = String(text || '').trim() || session.fallbackOpening;
    session.messages.push({ role: 'assistant', content: opening });
    draft = '';
    emitRender();
  }
  async function startDialogue({ npc, building, opening }) {
    completions.cancel();
    root.GameAIImage.cancel();
    const session = {
      npc,
      building,
      fallbackOpening: opening || '……',
      messages: []
    };
    current = session;
    draft = '';
    const affinity = affinityFor(session);
    root.Game.EventBus.emit('ai-dialogue-open', {
      npcId: npc.id,
      npcName: npc.name,
      npcTitle: npc.title,
      affinity
    });
    emitRender();
    emitStatus('opening', '她正根据与你的关系斟酌如何开口…');
    const cacheKey = `${npc.id}:${affinity.day}:${affinity.affinity}`;
    const cached = openingCache.get(cacheKey);
    if (cached) {
      applyOpening(session, cached);
      emitStatus('ready', '');
      return;
    }
    try {
      const result = await completions.run({
        messages: [{
          role: 'user',
          content: root.GameDialoguePrompts.opening(npc, building, affinity)
        }],
        maxTokens: 300,
        timeoutFallback: session.fallbackOpening,
        onUpdate(fullText) {
          if (current !== session) return;
          draft = fullText || '';
          emitRender();
        },
        onDone: (fullText) => applyOpening(session, fullText)
      });
      if (current !== session) return;
      if (result.reason === 'busy' || !session.messages.length) {
        applyOpening(session, session.fallbackOpening);
      }
      if (result.source === 'ai' && session.messages[0]?.content) {
        openingCache.set(cacheKey, session.messages[0].content);
      }
      emitStatus('ready', '');
    } catch (error) {
      if (current !== session) return;
      console.error('AI 开场白生成失败:', error.code || '', error.message, error.stack);
      applyOpening(session, session.fallbackOpening);
      emitStatus('error', '动态问候暂不可用，已使用角色原始问候。');
    }
  }
  async function sendMessage(text, options = {}) {
    const content = String(text || '').trim();
    if (!current || !content) return;
    if (completions.isBusy()) {
      emitStatus('busy', '上一条回复仍在生成，请稍候。');
      return;
    }
    const session = current;
    session.messages.push({
      role: 'user',
      content: String(options.displayContent || content).slice(0, 500)
    });
    draft = '';
    emitRender();
    emitStatus('thinking', '对方正在回应…');
    let completed = false;
    function finish(fullText) {
      const reply = String(fullText || '').trim();
      if (completed || current !== session || !reply) return;
      completed = true;
      session.messages.push({ role: 'assistant', content: reply });
      draft = '';
      emitRender();
      emitStatus('ready', options.successMessage || '');
    }
    try {
      const result = await completions.run({
        messages: root.GameDialoguePrompts.conversation(session, affinityFor(session)),
        maxTokens: 500,
        onUpdate(fullText) {
          if (current !== session) return;
          draft = fullText || '';
          emitRender();
        },
        onDone: finish
      });
      if (result.reason === 'busy') emitStatus('busy', '上一条回复仍在生成，请稍候。');
      if (result.source === 'ai' && completed && options.affinityEligible !== false) {
        root.Game.EventBus.emit('ai-dialogue-complete', session.npc.id);
      }
    } catch (error) {
      if (current !== session) return;
      console.error('AI 对话失败:', error.code || '', error.message, error.stack);
      draft = '';
      emitRender();
      emitStatus('error', errorMessage(error));
    }
  }

  async function giveGift() {
    if (!current) return;
    if (completions.isBusy()) {
      emitStatus('busy', '请等当前回复结束后再赠礼。');
      return;
    }
    const session = current;
    const result = await root.GameAffinity.giveGift(session.npc.id);
    if (current !== session) return;
    const giftMessage = result.changed
      ? `赠礼好感 +${root.GameAffinity.limits.giftGain}${result.durable ? '' : '，本次进度暂未同步'}`
      : '今日已经赠送过礼物了';
    root.Game.EventBus.emit('affinity-notice', {
      snapshot: result.snapshot,
      message: giftMessage
    });
    if (!result.changed) {
      root.GameAudio.sfx('deny');
      return;
    }
    await sendMessage('我送你一枚凝香玉佩，聊表心意。', {
      displayContent: '你赠送了一枚凝香玉佩。',
      affinityEligible: false,
      successMessage: giftMessage
    });
  }

  function closeDialogue() {
    completions.cancel();
    root.GameAIImage.cancel();
    current = null;
    draft = '';
    root.Game.EventBus.emit('ai-dialogue-close');
  }

  root.GameAI = {
    startDialogue,
    send: (text) => sendMessage(text),
    giveGift,
    generateImage: () => root.GameAIImage.generate(current),
    closeDialogue,
    isDialogueActive: () => Boolean(current)
  };
}(window));
