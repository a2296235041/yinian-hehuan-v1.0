(function installTournamentJudge(root) {
  'use strict';

  function text(value, max) {
    return String(value || '').trim().slice(0, max);
  }

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
    const proposedPlayer = 15 + creative + (seed % 7);
    const proposedOpponent = 14 + ((seed >>> 4) % 8);
    const balanced = root.GameTournamentCombatBalance?.adjustExchange?.(
      payload, proposedPlayer, proposedOpponent
    ) || { playerDelta: proposedPlayer, opponentDelta: proposedOpponent };
    const { playerDelta, opponentDelta } = balanced;
    const finished = payload.turn >= 3;
    const names = payload.opponents.map((item) => item.name).join('与');
    const winner = finished && playerTotal < opponentTotal ? 'opponent' : 'player';
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
    const summary = `你施展“${text(payload.move, 42)}”，灵力随招式骤然铺开，直逼${names}立足之处。${names}没有硬接，而是依照自身战法侧身卸力，旋即借擂台阵纹回卷灵光，试图从你的攻势边缘切入。双方力量连续碰撞，碎光沿地面迸散，护阵也随之泛起层层波纹。观战席先是一静，随后因这轮迅疾变招响起低声喝彩；待余波散去，你仍守住中线，对手则重新调整气息，准备迎接下一轮交锋。`;
    const verdictReason = playerDelta >= opponentDelta
      ? '招式衔接完整且取得主动，本回合判你占优。'
      : '对手化解充分并完成反制，本回合对手占优。';
    return {
      summary: text(summary, 200),
      verdict: `裁判判决：你 +${playerDelta} 点，对手 +${opponentDelta} 点。${verdictReason}`,
      playerDelta,
      opponentDelta,
      finished,
      winner: finished ? winner : 'ongoing',
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
      payload, proposedPlayer, proposedOpponent
    ) || { playerDelta: proposedPlayer, opponentDelta: proposedOpponent };
    const { playerDelta, opponentDelta } = balanced;
    const finished = payload.turn >= 3;
    const playerTotal = payload.scores.player + playerDelta;
    const opponentTotal = payload.scores.opponent + opponentDelta;
    const legacySummary = [
      raw.summary, raw.narration, raw.opponentAction, raw.globalCommentary
    ].filter(Boolean).join('');
    const summary = text(legacySummary, 200);
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
      summary: summary.length >= 150 ? summary : base.summary,
      verdict: `裁判判决：你 +${playerDelta} 点，对手 +${opponentDelta} 点。${verdictReason}`,
      playerDelta,
      opponentDelta,
      finished,
      winner: finished ? (playerTotal >= opponentTotal ? 'player' : 'opponent') : 'ongoing',
      relationshipChanges
    };
  }

  function buildPrompt(payload) {
    return [
      '你是修仙比武的战况叙事者与 AI 裁判。',
      '玩家输入的是本回合释放的招式或行动。承接此前战况，围绕这次行动续写一整段连续综述，不要拆成多个段落、标题或列表。',
      'summary 必须约 150-200 个中文字符，依次自然包含：玩家出招后的一系列后续、对手依据性格和战法作出的反应、双方碰撞与环境变化、少量观众反应、本回合结束时的局面。',
      '不要替玩家新增未描述的第二个主动招式；可以合理延伸招式造成的连锁变化。',
      '双方战力、攻击、防御、速度和气血必须影响裁决。弱者需要更具体合理的战术才能弥补数值差距，不能仅凭一句夸张描述无条件压倒强者。',
      '比赛固定三回合，前两回合不得结束。第三回合按累计得分决胜，同分判玩家胜。',
      `当前第${payload.turn}回合，比分：玩家${payload.scores.player}，对手${payload.scores.opponent}。`,
      `玩家资料：${JSON.stringify(payload.player)}。`,
      `对手资料：${JSON.stringify(payload.opponents)}。`,
      `当前关系数值：${JSON.stringify(payload.currentRelations)}。`,
      `此前全局战况摘要：${payload.battleSummary || '双方刚刚登台，尚未正式交锋。'}`,
      `此前完整战斗记录：\n${payload.battleHistory || '暂无'}`,
      `玩家本回合行动：${payload.move}`,
      '只返回 JSON，不要代码块。字段仅为：summary、verdictReason、playerDelta、opponentDelta、relationshipChanges。',
      'verdictReason 是 AI 裁判的简短判分理由，15-40 字，不要自行写具体分数。',
      payload.mode === 'spirit'
        ? 'relationshipChanges 为每名对手返回 {opponentId,delta,reason}。delta 必须是 -4 到 3 的整数：魅惑、诱导、动摇道心会增加堕落，尊重、唤醒原则或失败会降低堕落。'
        : 'relationshipChanges 为每名对手返回 {opponentId,delta,reason}。delta 必须是 -3 到 4 的整数：尊重、精彩表现和手下留情增加好感，羞辱、残酷和欺骗降低好感。',
      'playerDelta 0-45，opponentDelta 0-38。summary 使用第二人称“你”，避免色情描写。'
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
      currentRelations: opponents.map((profile) => (
        root.GameTournamentRelations.display(profile, active.mode, tournamentState)
      )),
      battleSummary: active.battleSummary || '',
      battleHistory: active.logs.slice(-14)
        .map((entry) => `${entry.speaker}：${entry.text}`).join('\n').slice(0, 3600)
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
