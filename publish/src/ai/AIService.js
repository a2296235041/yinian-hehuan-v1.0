(function installAIService(root) {
  'use strict';
  const dialogueSessions = new Map();
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
  function affinityFor(session) { return root.GameAffinity.getSnapshot(session.npc.id); }
  function emitRender() {
    if (!current) return;
    root.Game.EventBus.emit('ai-dialogue-render', {
      npcName: current.npc.name,
      npcTitle: `${current.npc.title} · ${current.npc.realm_label}`,
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
    if (['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE', 'INTERNAL_ERROR'].includes(code)) {
      return 'AI 服务暂时繁忙，本次交互已保留，请稍后再次尝试。';
    }
    if (error?.retryable && ['network', 'server', 'unknown'].includes(error?.category)) {
      return 'AI 服务暂时繁忙，本次交互已保留，请稍后再次尝试。';
    }
    return error?.message || 'DZMM 对话暂时不可用，请稍后再试。';
  }
  async function startDialogue({ npc, building, opening }) {
    completions.cancel();
    root.GameAIImage.cancel();
    let session = dialogueSessions.get(npc.id);
    const resumed = Boolean(session?.messages.length);
    if (!session) {
      session = { npc, building, fallbackOpening: opening || '……', messages: [] };
      dialogueSessions.set(npc.id, session);
    } else {
      session.npc = npc;
      session.building = building;
      session.fallbackOpening = opening || session.fallbackOpening;
    }
    current = session;
    draft = '';
    const affinity = affinityFor(session);
    root.Game.EventBus.emit('ai-dialogue-open', {
      npcId: npc.id,
      npcName: npc.name,
      npcTitle: `${npc.title} · ${npc.realm_label}`,
      affinity
    });
    emitRender();
    emitStatus('opening', resumed ? '她注意到你再次回来，正在重新开口…'
      : '她正根据与你的关系斟酌如何开口…');
    const greeting = await root.GameDialogueGreetings.generate({
      completions,
      session,
      affinity,
      returning: resumed,
      onUpdate(text) {
        if (current !== session) return;
        draft = text;
        emitRender();
      }
    });
    if (current !== session) return;
    session.messages.push({ role: 'assistant', content: greeting.text });
    draft = '';
    emitRender();
    emitStatus(greeting.failed ? 'error' : 'ready',
      greeting.failed ? '动态问候暂不可用，已使用本地回应。' : '');
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
      content: String(options.displayContent || content).slice(0, 500),
      promptContent: content.slice(0, 1200)
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
  async function giveGift(itemId, npcId) {
    if (!current || current.npc.id !== npcId) return;
    if (completions.isBusy()) {
      emitStatus('busy', '请等当前回复结束后再赠礼。');
      return;
    }
    const session = current;
    await root.GameNPCGiftInteraction.handle({
      session,
      itemId,
      isCurrent: () => current === session,
      sendMessage
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
    respondToInteraction: (prompt, display, status) => sendMessage(prompt, {
      displayContent: display, affinityEligible: false, successMessage: status
    }),
    giveGift,
    generateImage: () => root.GameAIImage.generate(current),
    closeDialogue,
    resetSessions: () => { closeDialogue(); dialogueSessions.clear(); },
    isDialogueActive: () => Boolean(current)
  };
}(window));
