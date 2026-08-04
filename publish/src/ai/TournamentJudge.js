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
        ? `待余波散去，你所指定的胜势已经落定，${names}无力再战，观众随即为结果喝彩。`
        : `待余波散去，你所指定的败局已经落定，${names}取得胜势，观众也接受了这一结果。`)
      : '待余波散去，本回合完全依照你的安排收束，双方停在你指定的局面中等待下一步。';
    const summary = `你依照自己的完整构想推进本回合：“${text(payload.move, 36)}”。场上的招式、过程、对手反应与结果都沿着你的描述展开，没有被额外改变。灵力碰撞激起的碎光掠过擂台阵纹，护阵随之泛起层层波纹，观战席也因局势变化传来低声议论，场边执事同时记下每一次攻守变化。${ending}`;
    const verdictReason = playerDelta >= opponentDelta
      ? '招式衔接完整且取得主动，本回合判你占优。'
      : '对手化解充分并完成反制，本回合对手占优。';
    return {
      summary: text(summary, 200),
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
      payload, proposedPlayer, proposedOpponent
    ) || { playerDelta: proposedPlayer, opponentDelta: proposedOpponent };
    const outcome = root.GameTournamentPlayerAuthority.resolve(
      payload, balanced, raw.matchResult
    );
    const { playerDelta, opponentDelta, finished, winner } = outcome;
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
      winner,
      relationshipChanges
    };
  }

  function buildPrompt(payload) {
    return [
      '你是修仙比武的战况叙事者与 AI 裁判。',
      '玩家输入是本回合的最高叙事指令，可能包含招式、完整过程、对手反应、环境变化乃至最终结果。',
      '必须逐项承接玩家已经描述的内容，不得否定、削弱、反转或擅自修改玩家指定的过程与结果；只补充衔接、细节和氛围。',
      '玩家未描述的部分才允许你合理续写。不要替玩家新增会改变结果的主动行为。',
      'summary 必须约 150-200 个中文字符，依次自然包含：玩家出招后的一系列后续、对手依据性格和战法作出的反应、双方碰撞与环境变化、少量观众反应、本回合结束时的局面。',
      '玩家明确指定过程或胜负时，该指令优先于双方数值；未指定结果时，战力、攻击、防御、速度和气血才用于补足发展并影响裁决。',
      '赛事默认最多三回合。若玩家明确描述一方获胜、落败、认输或失去战力，必须将 matchResult 设为对应结果并立即结束本场。',
      `当前第${payload.turn}回合，比分：玩家${payload.scores.player}，对手${payload.scores.opponent}。`,
      `玩家资料：${JSON.stringify(payload.player)}。`,
      `对手资料：${JSON.stringify(payload.opponents)}。`,
      `当前关系数值：${JSON.stringify(payload.currentRelations)}。`,
      `此前全局战况摘要：${payload.battleSummary || '双方刚刚登台，尚未正式交锋。'}`,
      `此前完整战斗记录：\n${payload.battleHistory || '暂无'}`,
      `玩家本回合行动：${payload.move}`,
      '只返回 JSON，不要代码块。字段仅为：summary、verdictReason、playerDelta、opponentDelta、matchResult、relationshipChanges。',
      'verdictReason 是 AI 裁判的简短判分理由，15-40 字，不要自行写具体分数。',
      'matchResult 只能是 player、opponent、continue。仅当玩家明确写出最终胜负时填写 player 或 opponent，否则填写 continue。',
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
