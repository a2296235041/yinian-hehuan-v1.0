(function installAIImageService(root) {
  'use strict';

  const workflow = root.GamefyRecipes.createImageWorkflow({
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

  function errorMessage(error) {
    const code = error?.code;
    if (code === 'RATE_LIMITED') return '请求太频繁，请稍后再次点击。';
    if (code === 'QUOTA_EXHAUSTED') return '积分或今日绘图额度不足。';
    if (code === 'VIP_REQUIRED') return '当前绘图模型需要 VIP 权限。';
    if (['UNAUTHORIZED', 'TOKEN_EXPIRED', 'FORBIDDEN'].includes(code)) {
      return '登录状态已失效，请重新进入游戏。';
    }
    if (['SENSITIVE_CONTENT_DETECTED', 'NON_ANIME_IMAGE_DETECTED'].includes(code)) {
      return '当前场景无法绘制，请更换对话内容。';
    }
    if ([
      'NETWORK_ERROR', 'TIMEOUT', 'DRAW_TIMEOUT', 'SERVICE_UNAVAILABLE',
      'INTERNAL_ERROR', 'CREATE_TASK_FAILED', 'NO_OUTPUT_IMAGES'
    ].includes(code)) return '绘图服务暂时繁忙，请稍后重新点击绘制。';
    if (error?.retryable && ['network', 'server', 'unknown'].includes(error?.category)) {
      return '绘图服务暂时繁忙，请稍后重新点击绘制。';
    }
    return error?.message || 'DZMM 绘图暂时不可用，请稍后再试。';
  }

  async function generate(session) {
    if (!session) return;
    if (workflow.isBusy()) {
      root.Game.EventBus.emit('ai-image-status', {
        status: 'busy',
        message: '上一张图片仍在绘制中。'
      });
      return;
    }
    const lastLine = [...session.messages].reverse()
      .find((message) => message.role === 'assistant')?.content || '';
    try {
      const result = await workflow.generate({
        npc: session.npc,
        building: session.building,
        lastLine,
        model: root.GameAIModels.getDrawModel(),
        dimension: '3:2',
        negativePrompt: 'text, logo, watermark, blurry, low quality, revealing clothing'
      });
      if (!result.ignored && result.image) {
        root.Game.EventBus.emit('ai-image-ready', {
          image: result.image,
          npcName: session.npc.name
        });
      }
    } catch (error) {
      console.error('AI 绘图失败:', error.code || '', error.message, error.stack);
      root.Game.EventBus.emit('ai-image-status', {
        status: 'error',
        message: errorMessage(error)
      });
    }
  }

  root.GameAIImage = {
    generate,
    cancel: () => workflow.cancel(),
    isBusy: () => workflow.isBusy()
  };
}(window));
