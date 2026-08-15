(function installTournamentImage(root) {
  'use strict';

  function opponent(active) {
    const id = active?.opponentIds?.[0];
    return root.GameTournamentRoster.getProfile(id, active?.roster);
  }

  function sceneMessages(active) {
    return (active?.logs || [])
      .filter((entry) => entry?.speaker === '你' || entry?.kind === 'opponent-response')
      .slice(-6)
      .map((entry) => ({
        role: entry.speaker === '你' ? 'user' : 'assistant',
        content: String(entry.text || '')
      }))
      .filter((message) => message.content);
  }

  function sessionFor(active) {
    if (!active || active.phase !== 'battle') return null;
    const profile = opponent(active);
    if (!profile) return null;
    const player = root.GamePlayerIdentity.get();
    const messages = sceneMessages(active);
    if (!messages.length && active.battleSummary) {
      messages.push({ role: 'assistant', content: String(active.battleSummary) });
    }
    if (messages.length > 0) {
      const userActions = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
      const explicitKeywords = ['撕', '脱', '裸', '舔', '插', '射', '淫', '穴', '棒', '奸', '操'];
      const isExplicit = explicitKeywords.some(kw => userActions.includes(kw));

      let systemContent = `
- 你是一位H-Game画师，擅长绘制色情、淫乱的NSFW场景。
- **画面风格**: 强调史诗感、动态模糊、速度线、体积光和粒子特效，营造出激烈的战斗氛围。
- **核心任务**: 将“武道大会”或“宗门大比”的战斗场景色情化。忽略战斗的严肃性，专注于描绘交战双方的身体接触、情欲姿态和淫荡表情。
- **具体要求**:
  - **战斗动作色情化**: 将所有的攻击、防御、闪避动作都描绘成充满性暗示的淫秽姿态。例如，剑击变成抚摸，擒拿变成揉捏巨乳，法术对轰变成精液与爱液的交织。
  - **表情与姿态**: 角色必须展现出极度淫荡的表情，如“阿黑颜”、失神、高潮脸。姿态要极尽挑逗，突出巨乳、肥臀。
  - **服装与裸露**: 战斗会撕裂或摧毁服装，暴露角色的身体。强调汗水、体液和精液涂满身体的淫秽场景。
`;

      if (isExplicit) {
        systemContent += `
  - **智能裸露规则**: 检测到玩家行为包含极端色情意图，必须执行最高级别的裸露标准。
  - **无遮挡裸露**: 必须完全裸露，清晰展示所有关键部位，包括阴道、肛门、乳头和完整的生殖器。不允许任何形式的遮挡或模糊处理。
  - **特写镜头**: 必须包含对正在进行的性行为的特写镜头，例如肉棒进出穴口的瞬间、精液灌满子宫的内部视角等。
  - **淫秽细节**: 突出描绘被撑开的穴口、外翻的阴唇、流淌的淫水和精液。
`;
      } else {
        systemContent += `
  - **智能裸露规则**: 玩家行为较为收敛，执行标准裸露。可以有部分衣物残留，或用姿态、角度巧妙遮挡关键部位，营造朦胧的色情感。
`;
      }

      systemContent += `
  - **多人场景**: 如果是多人战斗，则描绘成淫乱的群交场景。
- **输出**: 直接输出符合上述所有要求的、极端色情和暴力的NSFW图像提示词，无需任何解释。`;

      messages.unshift({
        role: 'system',
        content: systemContent
      });
    }
    return {
      player: {
        name: player.name,
        description: [player.appearance, player.physique, player.combat_style]
          .filter(Boolean)
          .join(' ')
      },
      npc: {
        ...profile,
        description: [profile.appearance, profile.physique, profile.combat_style]
          .filter(Boolean)
          .join(' ')
      },
      building: {
        id: 'tournament-arena',
        name: active.mode === 'spirit'
          ? 'Spirit Realm Martial Arts Tournament arena'
          : 'Hehuan Sect tournament arena'
      },
      messages
    };
  }

  async function generate(active) {
    const session = sessionFor(active);
    if (!session?.messages.length) {
      root.Game.EventBus.emit('ai-image-status', {
        status: 'error',
        message: '至少完成一次交锋后才能绘制此刻。'
      });
      return false;
    }
    await root.GameAIImage.generate(session);
    return true;
  }

  root.GameTournamentImage = Object.freeze({ generate, sessionFor });
}(window));
