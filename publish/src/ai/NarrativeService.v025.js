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
    time_shift: '宗门内时段推进',
    dual_cultivation: '私人场景中的双修',
    shop_purchase: '在宗门商店购买物品',
    use_item: '在储物袋中使用修炼物品'
  };

  function clean(text, fallback) {
    return root.GameAIText.clean(text, fallback);
  }

  function compose(story, fact) {
    const fixed = String(fact || '').trim();
    const narrative = clean(story, fixed);
    return narrative === fixed ? fixed : `${narrative}\n${fixed}`;
  }

  function ensureCompanionResponses(text, context) {
    const companions = Array.isArray(context?.companions) ? context.companions : [];
    if (!companions.length) return text;
    let result = String(text || '').trim();
    companions.forEach((companion) => {
      const name = String(companion?.name || '').trim();
      if (!name) return;
      const responsePattern = new RegExp(`${name}\\s*[：:]`);
      if (responsePattern.test(result)) return;
      const npc = root.GameNPCRelations.getByName(name);
      result += `\n${name}：${root.GameNPCRelations.address(npc)}，灵息已稳，继续调息。`;
    });
    return result;
  }

  function buildPrompt(kind, context) {
    const facts = JSON.stringify(context || {}).slice(0, 2400);
    const playerIdentity = root.GamePlayerIdentity.get();
    const npcMode = kind === 'npc_encounter';
    const longMode = kind === 'dual_cultivation';
    const companions = Array.isArray(context?.companions)
      ? context.companions.map((item) => item?.name).filter(Boolean)
      : [];
    const playerReference = ['cultivation', 'new_day', 'time_shift'].includes(kind)
      ? `玩家身份：${playerIdentity.role}。本事件必须以玩家为叙事主语，始终使用第二人称“你”或“你的”；严禁用“他、她、它、该弟子、玩家”代称玩家，也不得切换为第三人称。`
      : `玩家身份：${playerIdentity.role}，叙事中使用“${playerIdentity.pronoun}”指代玩家。`;
    const companionInstruction = longMode && companions.length
      ? `本次参与合修的角色有：${companions.join('、')}。${companions.map((name) => {
          const npc = root.GameNPCRelations.getByName(name);
          return `${name}称呼玩家为“${root.GameNPCRelations.address(npc)}”`;
        }).join('；')}。必须让每位角色至少有一句“角色名：台词”，并遵守各自称呼。`
      : '';
    return [
      npcMode
        ? '你正在扮演遭遇信息中的成年女性NPC。'
        : '你是仙侠养成游戏的叙事导演，只负责补充氛围和动作描写。',
      `当前事件：${eventNames[kind] || kind}。`,
      playerReference,
      playerIdentity.intimacyRule,
      `已经确定的事实与数值：${facts}`,
      '不得修改、虚构或重新计算任何属性、伤害、奖励、好感和修为数值。',
      context?.playerIntent
        ? `玩家本次主动提出的探索意图是：“${context.playerIntent}”。可以围绕这一意图描写观察与行动，但不能改变已经确定的遭遇结果。`
        : '',
      companionInstruction,
      longMode
        ? '请输出一段260至420字的完整剧情，描写灵气运转、场景氛围、人物配合、情绪变化和双修后的余韵。双修是仙侠修行仪式，保持含蓄克制，不描写露骨内容，不替玩家做出选择。'
        : npcMode
        ? '严格结合NPC身份、性格、地点与当前关系，直接对玩家说一句45至90字的话。'
        : '结合人物身份、境界、地点和行动，输出一小段45至90字的中文剧情。',
      '保持合欢宗仙侠世界观，不解释规则，不输出标题、列表、引号或选项。'
    ].join('');
  }

  // 每次玩家动作最多调用一次 AI；失败、繁忙或超时都返回确定性本地文本。
  async function generate(kind, context, fallback, onUpdate) {
    const localText = String(fallback || '事情告一段落。');
    await root.GameTrafficSaver.whenReady();
    const fixedFeature = root.GameTrafficSaver.featureForNarrative(kind);
    if (fixedFeature && root.GameTrafficSaver.isEnabled(fixedFeature)) {
      const textKey = kind === 'new_day' || kind === 'time_shift' ? kind : fixedFeature;
      const fixedText = root.GameTrafficSaver.nextText(textKey);
      onUpdate?.(fixedText);
      return fixedText;
    }
    let finalText = '';
    try {
      const result = await completions.run({
        messages: [{ role: 'user', content: buildPrompt(kind, context) }],
        maxTokens: kind === 'dual_cultivation' ? 720 : 220,
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
    generateDetailed: async (kind, context, fact, onUpdate) => {
      const generated = await generate(kind, context, fact, onUpdate);
      const complete = kind === 'dual_cultivation'
        ? ensureCompanionResponses(generated, context)
        : generated;
      return compose(complete, fact);
    },
    compose,
    cancel: () => completions.cancel(),
    isBusy: () => completions.isBusy()
  };
}(window));
