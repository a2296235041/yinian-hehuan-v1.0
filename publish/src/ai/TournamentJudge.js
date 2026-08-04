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
    const intent = root.GameTournamentIntent.analyze(payload.move);
    const creative = Math.min(9, Math.floor(payload.move.length / 28));
    const proposedPlayer = 15 + creative + (seed % 7), proposedOpponent = 14 + ((seed >>> 4) % 8);
    const balanced = root.GameTournamentCombatBalance?.adjustExchange?.(
      payload, proposedPlayer, proposedOpponent) || { playerDelta: proposedPlayer, opponentDelta: proposedOpponent };
    const exchange = root.GameTournamentIntent.enforceExchange(balanced, intent);
    const outcome = root.GameTournamentPlayerAuthority.resolve(payload, exchange, 'continue');
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
    let response;
    if (intent.adult) {
      response = intent.decisive
        ? `${names}猝不及防，呼吸与护体灵力同时乱了节奏。她面色迅速涨红，羞怒地试图稳住身形，却发现你的贴身控制已经占据主动，连手中兵刃都在指间摇晃。她咬牙瞪着你：“无耻……这算什么功法！”看台四周顿时响起一片惊呼，有人高声斥责你的手段，更多人则屏住呼吸盯着擂台。她的防守已经被彻底打乱，只能勉强维持姿势，短时间内无法夺回主动。`
        : `${names}察觉你的露骨意图后呼吸一乱，脸颊迅速涨红，目光在羞恼与警惕之间变化。她没有跳回普通剑斗节奏，而是紧盯着你的下一步动作，压低声音斥道：“你到底想做什么？”看台附近传来零星惊呼与议论，场上的注意却仍集中在你们之间。她维持着当前距离，等待你的意图真正化为行动。`;
    } else {
      response = `${names}迎着尚未散尽的攻势抬起兵刃，脚下连退两步后猛然稳住重心。她没有用旁观者的口吻评价方才一击，而是顺势逼近你，呼吸、眼神与招式都紧接着当前局面变化。${ending}看台边缘传来几声短促低呼，随即又被下一次交锋压了下去。`;
    }
    response = root.GameTournamentResponseText.ensure(response, payload, outcome);
    const verdictReason = playerDelta >= opponentDelta
      ? (intent.adult
        ? '你的贴身行动打乱了对手节奏，本回合判你占优。'
        : '你的行动更具侵略性，取得了场面上的主动，本回合判你占优。')
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
    const intent = root.GameTournamentIntent.analyze(payload.move);
    const exchange = root.GameTournamentIntent.enforceExchange(balanced, intent);
    const outcome = root.GameTournamentPlayerAuthority.resolve(payload, exchange, raw.matchResult);
    const { playerDelta, opponentDelta, finished, winner } = outcome;
    const legacyResponse = [raw.response, raw.summary, raw.narration,
      raw.opponentAction, raw.globalCommentary].filter(Boolean).join('');
    const response = root.GameTournamentResponseText.ensure(legacyResponse, payload, outcome);
    const verdictReason = intent.decisive && playerDelta > opponentDelta
      ? '你的行动已按描述取得控制，本回合判你占优。'
      : (text(raw.verdictReason, 70) || (playerDelta >= opponentDelta
        ? '招式执行更完整并取得主动，本回合判你占优。'
        : '对手应对更有效，本回合判对手占优。'));
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
  function fallbackReason(error) {
    const code = error?.code || '';
    const message = error?.message || '';
    if (code === 'NETWORK_ERROR' || code === 'TIMEOUT' || /failed to fetch/i.test(message)) {
      return '网络连接异常，本回合已由离线裁判完成；下一招会再次尝试 AI 对手回应。';
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
        messages: root.GameTournamentPrompt.buildMessages(payload),
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
