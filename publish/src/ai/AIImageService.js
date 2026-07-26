(function installAIImageService(root) {
  'use strict';

  const completions = root.GamefyRecipes.createCompletionsSafe({
    getModel: async () => {
      await root.GameAIModels.whenReady();
      return root.GameAIModels.getDialogueModel();
    },
    timeoutMs: 20_000,
    timeoutFallback: ''
  });

  async function summarizeSceneForDrawing(messages) {
    const recent = messages.slice(-4);
    if (!recent.length) return '';
    const result = await completions.run({
      messages: [
        {
          role: 'user',
          content: [
            'You are an expert in summarizing dialogue into a vivid, explicit, and precise visual description for an AI image generator.',
            'Analyze the following conversation snippet and extract the core visual elements.',
            'Focus ONLY on the characters\' physical actions, poses, facial expressions, body details, and the immediate environment.',
            'Do NOT include any spoken words, dialogue, or narrative text.',
            'The output must be a concise, purely descriptive sentence in English, suitable as a high-quality image prompt.',
            'Example Input: User: "Open your legs for me." Assistant: "Yes, master... I am spreading them wide... my pussy is so wet for you..."',
            'Example Output: "A woman with a lustful ahegao face, spreading her legs wide to present her dripping wet pussy to the viewer, begging for penetration."'
          ].join(' ')
        },
        {
          role: 'user',
          content: `Summarize this scene:\n${JSON.stringify(recent)}`
        }
      ],
      maxTokens: 200,
    });
    return result.text.trim();
  }

  const workflow = root.GamefyRecipes.createImageWorkflow({
    buildPrompt(options) {
      const time = root.GameTime?.getSnapshot?.();
      const affinity = root.GameAffinity?.getSnapshot?.(options.npc.id);
      const sceneDescription = options.sceneDescription || '';

      const artistStyle = '@tsuki no i-min, @kome cola, (@cutesexyrobutts:0.6),';

      const basePrompt = [
        'NSFW, explicit, photorealistic, best quality, masterpiece, absurdres,',
        'Chinese fantasy style, cinematic lighting,',
        `In the ${options.building.name}, during the ${time.name},`,
        `an adult woman, ${options.npc.name}, ${options.npc.title}.`,
        `Her personality is ${options.npc.personality}.`,
        `Her affinity towards player is ${affinity.relationship} (${affinity.affinity}/100).`
      ];

      const nsfwDetails = [
        'She is completely nude, showcasing her large breasts, detailed nipples, and wet pussy.',
        'Her pose is extremely seductive and inviting.',
        'Her facial expression is one of intense lust and desire, like ahegao.',
        'The core action of the scene is:',
        `"${sceneDescription}"`,
        'The atmosphere is thick with sexual tension.'
      ];

      return [artistStyle, ...basePrompt, ...nsfwDetails].join(' ');
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
    try {
      const sceneDescription = await summarizeSceneForDrawing(session.messages);
      if (!sceneDescription) {
        console.warn('场景描述为空，取消绘图');
        root.Game.EventBus.emit('ai-image-status', {
          status: 'error',
          message: '无法从当前对话提炼画面，请尝试继续对话。'
        });
        return;
      }

      const result = await workflow.generate({
        npc: session.npc,
        building: session.building,
        sceneDescription,
        model: root.GameAIModels.getDrawModel(),
        dimension: '3:2',
        negativePrompt: 'lazyneg, lazyhand, censored, mosaic censoring, (photorealistic, realistic), artist name, signature, lowres, bad anatomy, bad hands, text, error, missing fingers, extra fingers, extra limbs, fewer digits, cropped, worst quality, low quality, jpeg artifacts, watermark, username, conjoined, bad ai-generated, score_1, score_2, score_3,bad anatomy, bad proportions, deformed anatomy, deformed face, deformed eyes, text, multiple fingers, artist name,extra hands,strong, musclur, pubic hair'
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
