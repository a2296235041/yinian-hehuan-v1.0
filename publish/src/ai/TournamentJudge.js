(function installTournamentJudge(root) {
  'use strict';
  function text(value, max) { return String(value || '').trim().slice(0, max); }
  function number(value, min, max, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
  }
  function hash(input) {
    let value = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      value ^= input.charCodeAt(index);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }
  function parseJson(raw) {
    const cleaned = text(raw, 8000)
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    try {
      return JSON.parse(cleaned);
    } catch (_) {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start < 0 || end <= start) return null;
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (_) { return null; }
    }
  }
  function deterministicFallback(payload, reason) {
    const seed = hash(`${payload.turn}:${payload.move}:${payload.battleSummary}`);
    const creative = Math.min(9, Math.floor(payload.move.length / 28));
    const proposedPlayer = 15 + creative + (seed % 7), proposedOpponent = 14 + ((seed >>> 4) % 8);
    const balanced = root.GameTournamentCombatBalance?.adjustExchange?.(
      payload, proposedPlayer, proposedOpponent) || { playerDelta: proposedPlayer, opponentDelta: proposedOpponent };
    const outcome = root.GameTournamentPlayerAuthority.resolve(payload, balanced, 'continue');
    const { playerDelta, opponentDelta, finished, winner } = outcome;
    const names = payload.opponents.map((item) => item.name).join('与');
    const relationshipChanges = payload.opponents.map((opponent, index) => {
      const shifted = seed >>> ((index * 5) % 20);
      const delta = payload.mode === 'spirit' ? (shifted % 8) - 4 : (shifted % 8) - 3;
      return {
        opponentId: opponent.id,
        delta,
        reason: delta >= 0
          ? '你的临场表现令她产生了新的兴趣与动摇。'
          : '你的做法触碰了她的原则，使她重新提高戒心。'
      };
    });
    const ending = finished
      ? (winner === 'player'
        ? `${names}撑住最后一口气，抬眼直视着你：“这一场是你赢了，我认。”她收起架势，却没有掩饰眼底仍未散去的情绪。`
        : `${names}守住胜势后仍盯着你：“胜负已定，但我会记住你这一场的每一步。”她收势时没有半分轻慢。`)
      : `${names}重新稳住气息，目光紧扣着你：“还没结束，下一步我会亲自接住。”她随即调整站位，继续逼近。`;
    const isLewd = /闻|舔|摸|亲|脱|内裤|胸|臀|骚|穴|棒|插|射|淫|辱|奴/.test(payload.move);
    let response;
    if (isLewd) {
      response = `你的下流招数让${names}一阵错愕，脸颊瞬间飞上红霞。她虽想呵斥，但身体却不自觉地起了反应，呼吸也变得急促起来。${names}咬住唇，带着羞恼直接回应你的动作，既没有跳出眼前的交锋，也没有回避身体与情绪的变化。看台间短暂响起一阵惊呼，很快又安静下来。${ending}`;
    } else {
      response = `${names}迎着尚未散尽的攻势抬起兵刃，脚下连退两步后猛然稳住重心。她没有用旁观者的口吻评价方才一击，而是顺势逼近你，呼吸、眼神与招式都紧接着当前局面变化。${ending}看台边缘传来几声短促低呼，随即又被下一次交锋压了下去。`;
    }
    response = root.GameTournamentResponseText.ensure(response, payload, outcome);
    const verdictReason = playerDelta >= opponentDelta
      ? '你的行动更具侵略性，取得了场面上的主动，本回合判你占优。'
      : '对手的应对滴水不漏，并成功反制，本回合判对手占优。';
    return {
      response,
      summary: response,
      verdict: `裁判判决：你 +${playerDelta} 点，对手 +${opponentDelta} 点。${verdictReason}`,
      playerDelta,
      opponentDelta,
      finished,
      winner,
      relationshipChanges,
      fallback: true,
      fallbackMessage: reason
    };
  }
  function normalize(raw, payload) {
    const base = deterministicFallback(payload, '');
    if (!raw || typeof raw !== 'object') return base;
    const proposedPlayer = number(raw.playerDelta, 0, 45, base.playerDelta);
    const proposedOpponent = number(raw.opponentDelta, 0, 38, base.opponentDelta);
    const balanced = root.GameTournamentCombatBalance?.adjustExchange?.(
      payload, proposedPlayer, proposedOpponent) || { playerDelta: proposedPlayer, opponentDelta: proposedOpponent };
    const outcome = root.GameTournamentPlayerAuthority.resolve(payload, balanced, raw.matchResult);
    const { playerDelta, opponentDelta, finished, winner } = outcome;
    const legacyResponse = [raw.response, raw.summary, raw.narration,
      raw.opponentAction, raw.globalCommentary].filter(Boolean).join('');
    const response = root.GameTournamentResponseText.ensure(legacyResponse, payload, outcome);
    const verdictReason = text(raw.verdictReason, 70)
      || (playerDelta >= opponentDelta
        ? '招式执行更完整并取得主动，本回合判你占优。'
        : '对手应对更有效，本回合判对手占优。');
    const relationshipChanges = payload.opponents.map((opponent, index) => {
      const source = Array.isArray(raw.relationshipChanges) ? raw.relationshipChanges : [];
      const change = source.find((entry) => entry?.opponentId === opponent.id)
        || source[index] || {};
      const min = payload.mode === 'spirit' ? -4 : -3;
      const max = payload.mode === 'spirit' ? 3 : 4;
      return {
        opponentId: opponent.id,
        delta: number(change.delta, min, max, base.relationshipChanges[index].delta),
        reason: text(change.reason, 160) || base.relationshipChanges[index].reason
      };
    });
    return {
      response: response || base.response,
      summary: response || base.response,
      verdict: `裁判判决：你 +${playerDelta} 点，对手 +${opponentDelta} 点。${verdictReason}`,
      playerDelta,
      opponentDelta,
      finished,
      winner,
      relationshipChanges
    };
  }
  function buildPrompt(payload) {
    return [
      '你是修仙比武中的对手角色与 AI 裁判。',
      '玩家输入是本回合的最高叙事指令，可能包含招式、完整过程、对手反应、环境变化乃至最终结果。',
      '必须逐项承接玩家已经描述的内容，不得否定、削弱、反转或擅自修改玩家指定的过程与结果；只补充衔接、细节和氛围。',
      '玩家未描述的部分才允许你合理续写。不要替玩家新增会改变结果的主动行为。',
      'response 必须不少于 150 个中文字符，建议 150-220 字。写成与 NPC 对话相同的沉浸式现场回应，由对手直接用台词、动作、神态、情绪和攻守互动承接当前局面。',
      '不要写战报、综述、解说稿、裁判视角或“全局来看”式评论。对手必须像正在与你交互的人物一样开口并行动，而不是由旁白概括她做了什么。',
      '观众反应只能偶尔出现一至两处简短背景细节，不得抢占正文；正文重点始终是你与对手之间具体、连续的互动。',
      '不要复述、引用、改写或概括玩家刚输入的句子，也不要把玩家原话放进引号。直接从玩家描述的最后一个动作或结果之后开始续写。',
      '禁止出现“按照你的描述”“依照你的安排”“你所指定”“完整构想”“叙事指令”等元叙事表达，正文只能呈现正在发生的场景。',
      '每句话都必须推动事件：连续写清动作产生的具体效果、对手紧接着的身体与策略反应、双方下一步互动及局面变化；避免无关的通用环境套话。',
      '最重要规则：必须完全遵从玩家的叙事指令。如果玩家的指令包含色情意图或露骨描写，你的续写必须更加详细、淫秽和下流。如果玩家的指令是正常的战斗描述，你只能在细节和氛围上进行充满性暗示的补充，不得强行扭转为性爱场面。',
      '玩家明确指定过程或胜负时，该指令优先于双方数值；未指定结果时，战力、攻击、防御、速度和气血才用于补足发展并影响裁决。',
      '赛事默认最多三回合。若玩家明确描述一方获胜、落败、认输或失去战力，必须将 matchResult 设为对应结果并立即结束本场。',
      `当前第${payload.turn}回合，比分：玩家${payload.scores.player}，对手${payload.scores.opponent}。`,
      `玩家资料：${JSON.stringify(payload.player)}。`,
      `对手资料：${JSON.stringify(payload.opponents)}。`,
      `当前关系数值：${JSON.stringify(payload.currentRelations)}。`,
      `此前全局战况摘要：${payload.battleSummary || '双方刚刚登台，尚未正式交锋。'}`,
      `此前完整战斗记录：\n${payload.battleHistory || '暂无'}`,
      `玩家本回合行动：${payload.move}`,
      '只返回 JSON，不要代码块。字段仅为：response、verdictReason、playerDelta、opponentDelta、matchResult、relationshipChanges。',
      'verdictReason 是 AI 裁判的简短判分理由，15-40 字。需根据玩家指令的基调，在“专业评判”和“色情点评”间切换。不要自行写具体分数。',
      'matchResult 只能是 player、opponent、continue。仅当玩家明确写出最终胜负时填写 player 或 opponent，否则填写 continue。',
      payload.mode === 'spirit'
        ? 'relationshipChanges 为每名对手返回 {opponentId,delta,reason}。delta 必须是 -4 到 3 的整数。reason需根据玩家指令基调调整，可以是“她的道心因你的淫秽手段而动摇”，也可以是“你的强大实力令她折服”。'
        : 'relationshipChanges 为每名对手返回 {opponentId,delta,reason}。delta 必须是 -3 到 4 的整数。reason需根据玩家指令基调调整，可以是“她被你的肉棒彻底征服，好感大增”，也可以是“你的精彩表现赢得了她的尊重”。',
      'playerDelta 0-45，opponentDelta 0-38。response 使用第二人称“你”。当且仅当玩家的行动指令包含明确的色情意图时，才进行详细、露骨的色情描写；否则，只在细节和氛围上进行暧昧、充满性暗示的补充。'
    ].join('\n');
  }
  function fallbackReason(error) {
    const code = error?.code || '';
    const message = error?.message || '';
    if (code === 'NETWORK_ERROR' || code === 'TIMEOUT' || /failed to fetch/i.test(message)) {
      return '网络连接异常，本回合已由离线裁判完成；下一招会再次尝试 AI 全局解说。';
    }
    if (code === 'QUOTA_EXHAUSTED' || code === 'VIP_REQUIRED') {
      return '当前 AI 额度不足，本回合已由离线裁判完成。';
    }
    if (code === 'RATE_LIMITED') {
      return 'AI 请求较多，本回合已由离线裁判完成，稍后可继续尝试。';
    }
    return 'AI 暂时不可用，本回合已由离线裁判完成。';
  }
  async function judge(active, move, tournamentState) {
    const opponents = active.opponentIds
      .map((id) => root.GameTournamentRoster.getProfile(id, active.roster))
      .filter(Boolean);
    const payload = {
      turn: active.turn + 1,
      mode: active.mode,
      move,
      player: root.GameTournamentRoster.getProfile('player', active.roster),
      opponents,
      scores: active.scores,
      currentRelations: opponents.map((profile) => root.GameTournamentRelations.display(profile, active.mode, tournamentState)),
      battleSummary: active.battleSummary || '',
      battleHistory: active.logs.slice(-14).map((entry) => `${entry.speaker}：${entry.text}`)
        .join('\n').slice(0, 3600)
    };
    if (root.navigator?.onLine === false || typeof root.dzmm?.completions !== 'function') {
      return deterministicFallback(payload, '当前处于离线状态，本回合已由离线裁判完成。');
    }
    let fullText = '';
    let completed = false;
    try {
      await root.dzmm.completions({
        model: 'default',
        messages: [{ role: 'user', content: buildPrompt(payload) }],
        maxTokens: 800
      }, (content, done) => {
        fullText = content || '';
        if (done) completed = true;
      });
      if (!completed) throw new Error('AI 响应未完整结束');
      return normalize(parseJson(fullText), payload);
    } catch (error) {
      console.error('武道解说失败:', error?.code || '', error?.message || '未知错误', error?.stack || '');
      return deterministicFallback(payload, fallbackReason(error));
    }
  }
  root.GameTournamentJudge = Object.freeze({ judge });
}(window));
