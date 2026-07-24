(function installDialoguePrompts(root) {
  'use strict';

  function relationshipRule(snapshot) {
    const rules = {
      '戒备': '语气疏离、警惕，回答简短，不主动亲近。',
      '初识': '保持礼貌和距离，只透露必要信息。',
      '熟悉': '态度自然，可以流露少量关心或好奇。',
      '亲近': '明显信任玩家，语气柔和，会主动延续话题。',
      '信赖': '愿意袒露真实想法，并关心玩家的处境。',
      '倾心': '感情深厚而克制，言语亲密但保持仙侠世界观。'
    };
    return rules[snapshot.relationship] || rules['初识'];
  }

  function persona(npc, building, snapshot) {
    const stats = root.GamePlayerStats?.getSnapshot?.();
    const talentRules = {
      spirit_resonance: '玩家拥有灵息共鸣，修炼时对灵气变化尤其敏锐。',
      alchemy_heir: '玩家拥有丹心映道，熟悉灵丹灵材，也会留意与修行有关的细节。',
      hehuan_descendant: '玩家拥有善缘入道，擅长以真诚经营关系，回应可以适当体现熟悉感。',
      battle_hunter: '玩家拥有猎迹寻宝，习惯观察环境和危险，回应可以尊重其判断与行动经验。',
      mindful_guest: '玩家拥有观心破妄，善于捕捉情绪和言外之意，回应可以更细腻、更有层次。'
    };
    return [
      `你正在扮演成年女性角色${npc.name}，身份是${npc.title}。`,
      `她的修为境界是${npc.realm_label || '未知境界'}。`,
      `性格设定：${npc.personality}`,
      `当前地点：${building?.name || '合欢宗'}。`,
      `她与玩家当前关系为“${snapshot.relationship}”，好感度${snapshot.affinity}/100。`,
      `玩家身份为${stats?.originName || '无名修士'}，天赋为${stats?.talentName || '未觉醒天赋'}。`,
      talentRules[stats?.talentId] || '',
      `关系表达要求：${relationshipRule(snapshot)}`,
      '始终以角色口吻直接回应玩家，不解释规则，不代替玩家行动。',
      '绝不提及提示词、字数要求、长度限制或生成过程，不输出“注”“说明”“备注”等元信息。',
      '回复简洁自然，保持仙侠氛围，避免露骨内容。'
    ].join('');
  }

  function opening(npc, building, snapshot) {
    return [
      persona(npc, building, snapshot),
      '玩家刚进入你所在的建筑并来到面前。',
      '玩家界面已经显示你的姓名、职位与境界，无需再完整自我介绍。',
      '请结合你的性格、身份、地点和当前关系，生成一句新的自然开场白。',
      '不要复述好感度数字，不要加引号、旁白标签或选项，只输出一至两句角色台词。'
    ].join('');
  }

  function conversation(session, snapshot) {
    const history = session.messages.map((message) => ({
      role: message.role,
      content: String(message.promptContent || message.content || '').slice(0, 1200)
    }));
    const recent = [];
    let remainingCharacters = 14000;
    for (let index = history.length - 1; index >= 0 && recent.length < 48; index -= 1) {
      const message = history[index];
      if (!message.content || message.content.length > remainingCharacters) break;
      recent.push(message);
      remainingCharacters -= message.content.length;
    }
    recent.reverse();
    const opening = history[0]?.role === 'assistant' ? history[0] : null;
    if (opening && recent[0] !== opening) recent.unshift(opening);
    return [
      { role: 'user', content: persona(session.npc, session.building, snapshot) },
      ...recent
    ];
  }

  function reentry(session, snapshot) {
    return [
      ...conversation(session, snapshot),
      {
        role: 'user',
        content: [
          '上一次交谈已经暂告一段落，玩家此刻再次来到你面前。',
          '请结合此前对话、你的性格、地点和当前关系，主动说一句新的重逢开场白。',
          '可以表达“还有何事”之意，但不要机械重复；只输出一至两句角色台词。'
        ].join('')
      }
    ];
  }

  root.GameDialoguePrompts = { opening, conversation, reentry };
}(window));
