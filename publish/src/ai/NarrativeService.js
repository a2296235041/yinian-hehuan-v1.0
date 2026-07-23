(function installNarrativeService(root) {
  'use strict';

  const completions = root.GamefyRecipes.createCompletionsSafe({
    getModel: async () => {
      await root.GameAIModels.whenReady();
      return root.GameAIModels.getDialogueModel();
    },
    timeoutMs: 25_000,
    timeoutFallback: '灵机流转之间，这段经历已悄然成为你修行路上的一笔。'
  });

  const eventNames = {
    exploration: '出山探索遭遇',
    npc_encounter: '在野外偶遇熟识的NPC',
    battle_action: '战斗中的一次行动',
    battle_end: '战斗结束与奖励结算',
    cultivation: '宗门内修炼',
    new_day: '新一天开始',
    shop_purchase: '在宗门商店购买物品',
    use_item: '在储物袋中使用修炼物品'
  };

  function clean(text, fallback) {
    const value = String(text || '').trim().replace(/^["“]|["”]$/g, '');
    return value || fallback;
  }

  function compose(story, fact) {
    const fixed = String(fact || '').trim();
    const narrative = clean(story, fixed);
    return narrative === fixed ? fixed : `${narrative}\n${fixed}`;
  }

  function buildPrompt(kind, context) {
    const facts = JSON.stringify(context || {}).slice(0, 2400);
    const npcMode = kind === 'npc_encounter';
    return [
      npcMode
        ? '你正在扮演遭遇信息中的成年女性NPC。'
        : '你是仙侠养成游戏的叙事导演，只负责补充氛围和动作描写。',
      `当前事件：${eventNames[kind] || kind}。`,
      `已经确定的事实与数值：${facts}`,
      '不得修改、虚构或重新计算任何属性、伤害、奖励、好感和修为数值。',
      npcMode
        ? '严格结合NPC身份、性格、地点与当前关系，直接对玩家说一句45至90字的话。'
        : '结合人物身份、境界、地点和行动，输出一小段45至90字的中文剧情。',
      '保持合欢宗仙侠世界观，不解释规则，不输出标题、列表、引号或选项。'
    ].join('');
  }

  // 每次玩家动作最多调用一次 AI；失败、繁忙或超时都返回确定性本地文本。
  async function generate(kind, context, fallback, onUpdate) {
    const localText = String(fallback || '事情告一段落。');
    let finalText = '';
    try {
      const result = await completions.run({
        messages: [{ role: 'user', content: buildPrompt(kind, context) }],
        maxTokens: 220,
        timeoutFallback: localText,
        onUpdate(fullText) {
          finalText = clean(fullText, localText);
          onUpdate?.(finalText);
        },
        onDone(fullText) {
          finalText = clean(fullText, localText);
          onUpdate?.(finalText);
        }
      });
      if (result.reason === 'busy') return localText;
      return clean(finalText || result.text, localText);
    } catch (error) {
      console.error('AI 剧情生成失败:', error.code || '', error.message, error.stack);
      return localText;
    }
  }

  root.GameNarrative = {
    generate,
    generateDetailed: async (kind, context, fact) => compose(
      await generate(kind, context, fact),
      fact
    ),
    compose,
    cancel: () => completions.cancel(),
    isBusy: () => completions.isBusy()
  };
}(window));
