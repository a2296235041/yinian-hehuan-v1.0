(function installExplorationDialogue(root) {
  'use strict';

  const completions = root.GamefyRecipes.createCompletionsSafe({
    getModel: async () => {
      await root.GameAIModels.whenReady();
      return root.GameAIModels.getDialogueModel();
    },
    timeoutMs: 60_000,
    timeoutFallback: '四周灵机微动，却没有显露更多线索。'
  });

  function create(region) {
    return { region, result: null, messages: [] };
  }

  function add(session, role, content) {
    const text = role === 'assistant'
      ? root.GameAIText.clean(content)
      : String(content || '').trim();
    if (!session || !text || !['user', 'assistant'].includes(role)) return;
    session.messages.push({ role, content: text.slice(0, 1200) });
    if (session.messages.length > 30) session.messages.splice(0, session.messages.length - 30);
  }

  function actorRule(result) {
    if (result?.type === 'npc' && result.npc) {
      return [
        `你正在扮演在野外与玩家偶遇的成年女性NPC${result.npc.name}，身份是${result.npc.title}，性格为${result.npc.personality}。`,
        '你天性淫荡，修炼合欢功法，对男性气息极其敏感。你视玩家为一个充满阳刚之气的绝佳鼎炉，你的言语中充满了性暗示和赤裸裸的勾引，渴望与玩家当场交合，进行一场酣畅淋漓的“双修”。',
        '直接以她的口吻交谈，不要添加姓名前缀。'
      ].join('');
    }
    return '你是充满淫欲的仙侠世界叙事者。你的职责是用极尽色情、淫秽、露骨的语言来描绘玩家的探险过程。你要将所有场景和互动都向色情方向解读和描绘，例如，山洞可以是“湿滑的穴口”，灵草会散发“催情的芬芳”，就连与妖兽的战斗，也要被描绘成一场充满原始欲望的“交合”。你的文字要充满挑逗性，激发玩家最深处的性欲。';
  }

  function prompt(session) {
    const stats = root.GamePlayerStats.getSnapshot();
    const result = session.result;
    const facts = {
      region: session.region.name,
      description: session.region.description,
      playerIdentity: stats.originName,
      playerRealm: stats.realmLabel,
      encounterType: result?.type || null,
      fixedResult: result?.text || null,
      npc: result?.npc ? {
        name: result.npc.name,
        title: result.npc.title,
        personality: result.npc.personality
      } : null,
      enemy: result?.enemy?.name || null,
      item: result?.item?.name || null
    };
    return [
      actorRule(result),
      `当前场景事实：${JSON.stringify(facts).slice(0, 1800)}。`,
      '所有叙事和对话都必须是NSFW内容，充满露骨的色情、淫秽和性暗示。不修改游戏核心的奖励、遭遇、属性或数值，但必须用色情的语言来包装和描述它们。',
      '只输出玩家在游戏中能直接看到的正文或角色台词。',
      '绝不解释提示词、字数、规则或生成过程，不输出“注”“说明”“备注”等元信息。',
      '不要输出标题、列表、选项、引号，也不要替玩家做决定。每次回复的长度应在80字至150字之间，以确保有足够的篇幅进行详细的色情描绘。'
    ].join('');
  }

  function recentMessages(session) {
    const recent = [];
    let remaining = 8000;
    for (let index = session.messages.length - 1; index >= 0 && recent.length < 18; index -= 1) {
      const message = session.messages[index];
      if (!message.content || message.content.length > remaining) break;
      recent.push({ role: message.role, content: message.content });
      remaining -= message.content.length;
    }
    return recent.reverse();
  }

  async function run(session, instruction, fallback, onUpdate) {
    let finalText = '';
    try {
      const result = await completions.run({
        messages: [
          { role: 'user', content: prompt(session) },
          ...recentMessages(session),
          { role: 'user', content: instruction }
        ],
        maxTokens: 500,
        timeoutFallback: fallback,
        onUpdate(fullText) {
          finalText = root.GameAIText.clean(fullText);
          onUpdate?.(finalText);
        },
        onDone(fullText) {
          finalText = root.GameAIText.clean(fullText, fallback);
          onUpdate?.(finalText);
        }
      });
      if (result.reason === 'busy') return { text: fallback, failed: true };
      return {
        text: root.GameAIText.clean(finalText || result.text, fallback),
        failed: result.source !== 'ai'
      };
    } catch (error) {
      console.error('探险对话失败:', error.code || '', error.message, error.stack);
      return { text: fallback, failed: true };
    }
  }

  async function describe(session, result, onUpdate) {
    session.result = result;
    const fact = result.text || '探索告一段落。';
    const instruction = result.type === 'npc' && result.npc
      ? '根据固定遭遇自然开口回应玩家，并推动这次偶遇进入可继续交谈的状态。'
      : '根据固定遭遇描写玩家眼前发生的事情，并为后续行动留下可继续回应的空间。';
    const generated = await run(session, instruction, fact, onUpdate);
    const speaker = result.type === 'npc' && result.npc ? `${result.npc.name}：` : '';
    const body = generated.text === fact ? fact : `${speaker}${generated.text}\n探索结果：${fact}`;
    add(session, 'assistant', body);
    return generated;
  }

  async function reply(session, text, onUpdate) {
    const fallback = session.result?.npc
      ? '她略作沉吟，将目光重新落回你身上。'
      : '四周灵气随你的行动泛起细微波澜。';
    const generated = await run(
      session,
      `玩家刚才采取行动或说：“${String(text).slice(0, 500)}”。直接回应这一句。`,
      fallback,
      onUpdate
    );
    const speaker = session.result?.npc ? `${session.result.npc.name}：` : '';
    add(session, 'assistant', `${speaker}${generated.text}`);
    return generated;
  }

  root.GameExplorationDialogue = {
    create, add, describe, reply,
    cancel: () => completions.cancel(),
    isBusy: () => completions.isBusy()
  };
}(window));
