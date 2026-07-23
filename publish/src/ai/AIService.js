(function installAIService(root) {
  'use strict';

  const sessions = new Map();
  let current = null;
  let draft = '';

  const completions = root.GamefyRecipes.createCompletionsSafe({
    getModel: () => root.GameAIModels.getDialogueModel(),
    timeoutMs: 60_000,
    timeoutFallback: '她沉默片刻，似乎正在斟酌接下来该说什么。'
  });

  const imageWorkflow = root.GamefyRecipes.createImageWorkflow({
    buildPrompt(options) {
      const line = String(options.lastLine || '').slice(0, 300);
      return [
        'Painterly Chinese fantasy game scene, cinematic wide composition.',
        `Inside ${options.building.name}, show the adult woman ${options.npc.name},`,
        `${options.npc.title}, personality: ${options.npc.personality}.`,
        `Current moment: ${line}`,
        'Tasteful fully covered traditional fantasy clothing, expressive pose,',
        'environment details matching the building, no UI, no text, no logo, no watermark.'
      ].join(' ');
    },
    onStatus(status) {
      root.Game.EventBus.emit('ai-image-status', { status });
    }
  });

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

  function startDialogue({ npc, building, opening }) {
    completions.cancel();
    imageWorkflow.cancel();
    const messages = sessions.get(npc.id) || [
      { role: 'assistant', content: opening || '……' }
    ];
    sessions.set(npc.id, messages);
    current = { npc, building, messages };
    draft = '';
    root.Game.EventBus.emit('ai-dialogue-open', {
      npcName: npc.name,
      npcTitle: npc.title
    });
    emitRender();
    emitStatus('ready', '');
  }

  function buildMessages(session) {
    const { npc, building, messages } = session;
    const persona = [
      `你正在扮演成年女性角色${npc.name}，身份是${npc.title}。`,
      `她的性格是：${npc.personality}`,
      `当前地点是${building?.name || '合欢宗'}。`,
      '始终以角色口吻直接回应玩家，不要解释规则，不要代替玩家行动。',
      '每次回复控制在120字以内，保持仙侠氛围，避免露骨内容。'
    ].join('');
    return [
      { role: 'user', content: persona },
      ...messages.slice(-12)
    ];
  }

  function errorMessage(error, action) {
    const code = error?.code;
    if (code === 'RATE_LIMITED') return '请求太频繁，请稍后再次点击。';
    if (code === 'QUOTA_EXHAUSTED') return '积分或今日额度不足。';
    if (code === 'VIP_REQUIRED') return '当前模型需要 VIP 权限。';
    if (['UNAUTHORIZED', 'TOKEN_EXPIRED', 'FORBIDDEN'].includes(code)) {
      return '登录状态已失效，请重新进入游戏。';
    }
    if (['SENSITIVE_CONTENT_DETECTED', 'NON_ANIME_IMAGE_DETECTED'].includes(code)) {
      return action === 'draw' ? '当前场景无法绘制，请更换对话内容。' : '请换一种表达后再试。';
    }
    return error?.message || 'DZMM 服务暂时不可用，请稍后再试。';
  }

  async function send(text) {
    const content = String(text || '').trim();
    if (!current || !content) return;
    if (completions.isBusy()) {
      emitStatus('busy', '上一条回复仍在生成，请稍候。');
      return;
    }

    const session = current;
    session.messages.push({ role: 'user', content: content.slice(0, 500) });
    draft = '';
    emitRender();
    emitStatus('thinking', '对方正在回应…');
    let completed = false;

    const finish = (fullText) => {
      const reply = String(fullText || '').trim();
      if (completed || current !== session || !reply) return;
      completed = true;
      session.messages.push({ role: 'assistant', content: reply });
      draft = '';
      emitRender();
      emitStatus('ready', '');
      root.Game.EventBus.emit('ai-dialogue-complete', session.npc.id);
    };

    try {
      const result = await completions.run({
        messages: buildMessages(session),
        maxTokens: 500,
        onUpdate(fullText) {
          if (current !== session) return;
          draft = fullText || '';
          emitRender();
        },
        onDone: finish
      });
      if (result.reason === 'busy') emitStatus('busy', '上一条回复仍在生成，请稍候。');
    } catch (error) {
      if (current !== session) return;
      console.error('AI 对话失败:', error.code || '', error.message, error.stack);
      draft = '';
      emitRender();
      emitStatus('error', errorMessage(error, 'chat'));
    }
  }

  async function generateImage() {
    if (!current) return;
    if (imageWorkflow.isBusy()) {
      root.Game.EventBus.emit('ai-image-status', {
        status: 'busy',
        message: '上一张图片仍在绘制中。'
      });
      return;
    }
    const session = current;
    const lastLine = [...session.messages].reverse()
      .find((message) => message.role === 'assistant')?.content || '';
    try {
      const result = await imageWorkflow.generate({
        npc: session.npc,
        building: session.building,
        lastLine,
        model: root.GameAIModels.getDrawModel(),
        dimension: '3:2',
        negativePrompt: 'text, logo, watermark, blurry, low quality, revealing clothing'
      });
      if (!result.ignored && result.image && current === session) {
        root.Game.EventBus.emit('ai-image-ready', {
          image: result.image,
          npcName: session.npc.name
        });
      }
    } catch (error) {
      console.error('AI 绘图失败:', error.code || '', error.message, error.stack);
      root.Game.EventBus.emit('ai-image-status', {
        status: 'error',
        message: errorMessage(error, 'draw')
      });
    }
  }

  function closeDialogue() {
    completions.cancel();
    imageWorkflow.cancel();
    current = null;
    draft = '';
    root.Game.EventBus.emit('ai-dialogue-close');
  }

  root.GameAI = {
    startDialogue,
    send,
    generateImage,
    closeDialogue,
    isDialogueActive: () => Boolean(current)
  };
}(window));
