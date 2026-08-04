(function installPrivateGroupDialogueService(root) {
  'use strict';

  const sessions = root.GameDialogueHistory.sessions;
  const completions = root.GamefyRecipes.createCompletionsSafe({
    getModel: async () => {
      await root.GameAIModels.whenReady();
      return root.GameAIModels.getDialogueModel();
    },
    timeoutMs: 60_000
  });
  let current = null;

  function emit(name, payload = {}) {
    root.Game.EventBus.emit(name, payload);
  }

  function emitRender() {
    if (!current) return;
    emit('private-group-render', {
      messages: current.messages.slice(),
      companions: current.companions.slice()
    });
  }

  function status(state, message = '') {
    emit('private-group-status', { state, message });
  }

  function errorMessage(error) {
    const code = error?.code;
    if (code === 'RATE_LIMITED') return '请求太频繁，请稍后再次发送。';
    if (code === 'QUOTA_EXHAUSTED') return '积分或今日对话额度不足。';
    if (code === 'VIP_REQUIRED') return '当前对话模型需要 VIP 权限。';
    if (code === 'AI_INVALID_RESPONSE') return 'AI 回应格式不完整，请重新发送本轮内容。';
    if (['UNAUTHORIZED', 'TOKEN_EXPIRED', 'FORBIDDEN'].includes(code)) {
      return '登录状态已失效，请重新进入游戏。';
    }
    return error?.message || '多人互动暂时不可用，请稍后再试。';
  }

  function rejectLocalFallback(context = {}) {
    if (context.reason === 'request_failed' && context.error) throw context.error;
    const error = new Error('AI 回应格式不完整，请重新发送本轮内容。');
    error.code = 'AI_INVALID_RESPONSE';
    throw error;
  }

  function rollbackMessage(session, message) {
    const index = session.messages.indexOf(message);
    if (index >= 0) session.messages.splice(index, 1);
  }

  async function recordResponders(ids) {
    const scene = root.game?.scene?.getScene('GameScene');
    const npcSystem = scene?.npcSystem;
    if (!npcSystem) return;
    for (const npcId of [...new Set(ids)]) {
      try {
        await npcSystem.recordDialogue(npcId);
        emit('npc-dialogue-completed', { npcId, source: 'private-group' });
      } catch (error) {
        console.error('多人互动好感记录失败:', error.code || '', error.message, error.stack);
      }
    }
  }

  function open({ companions, location }) {
    const selected = (companions || []).filter(Boolean).slice(0, 3);
    if (!selected.length) return false;
    root.GameAI?.closeDialogue?.();
    completions.cancel();
    const id = root.GamePrivateGroupPrompts.sessionId(selected);
    const session = sessions.get(id) || { messages: [] };
    session.companions = selected;
    session.location = location;
    if (!session.messages.length) {
      session.messages.push({
        role: 'assistant',
        content: root.GamePrivateGroupPrompts.opening(selected, location)
      });
    }
    sessions.set(id, session);
    current = session;
    emit('private-group-open', {
      locationName: location.name,
      companions: selected.map((npc) => ({
        id: npc.id,
        name: npc.name,
        title: npc.title,
        affinity: root.GameAffinity.getSnapshot(npc.id)
      }))
    });
    emitRender();
    status('ready');
    return true;
  }

  async function send(value) {
    const content = String(value || '').trim().slice(0, 500);
    if (!current || !content) return { ok: false, reason: current ? 'empty' : 'inactive' };
    if (completions.isBusy()) {
      status('busy', '上一轮回应仍在生成，请稍候。');
      return { ok: false, reason: 'busy' };
    }
    const session = current;
    const playerMessage = { role: 'user', content, promptContent: content };
    session.messages.push(playerMessage);
    emitRender();
    status('thinking', '众人正在回应，约需 10–30 秒…');
    const ids = session.companions.map((npc) => npc.id);
    const generator = root.GamefyRecipes.createAiJson({
      completions,
      maxTokens: 700,
      validate: (result) => root.GamePrivateGroupPrompts.validate(result, ids),
      fallback: rejectLocalFallback
    });
    try {
      const result = await generator.generate({
        instructions: root.GamePrivateGroupPrompts.instructions(
          session.companions, session.location
        ),
        userText: root.GamePrivateGroupPrompts.userText(session, content)
      });
      if (result.ignored || current !== session) {
        rollbackMessage(session, playerMessage);
        if (current === session) emitRender();
        return { ok: false, reason: 'stale' };
      }
      if (result.source !== 'ai') rejectLocalFallback({ reason: 'invalid_source' });
      session.messages.push({
        role: 'assistant',
        content: root.GamePrivateGroupPrompts.format(result.value, session.companions)
      });
      emitRender();
      status('ready');
      await recordResponders(result.value.responses.map((response) => response.speakerId));
      return { ok: true, source: 'ai' };
    } catch (error) {
      rollbackMessage(session, playerMessage);
      if (current !== session) return { ok: false, reason: 'stale' };
      emitRender();
      console.error('私人多人对话失败:', error.code || '', error.message, error.stack);
      status('error', errorMessage(error));
      return { ok: false, reason: error.code || 'request-error' };
    }
  }

  function close() {
    completions.cancel();
    current = null;
    emit('private-group-close');
  }

  root.GamePrivateGroupDialogue = Object.freeze({
    open,
    send,
    close,
    isActive: () => Boolean(current)
  });
}(window));
