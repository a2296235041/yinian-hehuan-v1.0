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
    const creative = Math.min(12, Math.floor(payload.move.length / 24));
    const playerDelta = 19 + creative + (seed % 7);
    const opponentDelta = 7 + ((seed >>> 4) % 11);
    const finished = payload.turn >= 3;
    const playerTotal = payload.scores.player + playerDelta;
    const opponentTotal = payload.scores.opponent + opponentDelta;
    const names = payload.opponents.map((item) => item.name).join('与');
    const winner = finished && playerTotal < opponentTotal ? 'opponent' : 'player';
    return {
      opponentAction: `${names}循着你的灵力变化强行变招，试图夺回擂台中线。`,
      narration: `你的构想化作真实攻势铺满擂台，${names}在灵光与罡风中连续拆招，护体灵韵被震得明灭不定。`,
      globalCommentary: `纵观此前交锋，你始终在主动改写战斗节奏。本回合的新招不仅延续了先前积累的优势，还迫使${names}放弃原定战术。当前擂台中央由你控制，对手只能寻找反击缝隙。`,
      battleSummary: `第${payload.turn}回合后，你以连续变化掌握主动，${names}被迫转入守势。当前比分为你${playerTotal}、对手${opponentTotal}。`,
      tacticalHint: finished ? '三招已尽，裁判即将宣布最终结果。' : '对手阵脚已乱，可继续追击其灵力转换的空隙。',
      playerDelta,
      opponentDelta,
      finished,
      winner: finished ? winner : 'ongoing',
      fallback: true,
      fallbackMessage: reason
    };
  }

  function normalize(raw, payload) {
    const base = deterministicFallback(payload, '');
    if (!raw || typeof raw !== 'object') return base;
    const playerDelta = number(raw.playerDelta, 0, 45, base.playerDelta);
    const opponentDelta = number(raw.opponentDelta, 0, 38, base.opponentDelta);
    const finished = payload.turn >= 3;
    const playerTotal = payload.scores.player + playerDelta;
    const opponentTotal = payload.scores.opponent + opponentDelta;
    return {
      opponentAction: text(raw.opponentAction, 360) || base.opponentAction,
      narration: text(raw.narration, 1100) || base.narration,
      globalCommentary: text(raw.globalCommentary || raw.commentary, 900)
        || base.globalCommentary,
      battleSummary: text(raw.battleSummary, 600) || base.battleSummary,
      tacticalHint: text(raw.tacticalHint, 240) || base.tacticalHint,
      playerDelta,
      opponentDelta,
      finished,
      winner: finished ? (playerTotal >= opponentTotal ? 'player' : 'opponent') : 'ongoing'
    };
  }

  function buildPrompt(payload) {
    return [
      '你是修仙武道大会的全局战局导演、首席裁判和热血解说。',
      '玩家每次输入的是本回合行动。你必须承接此前发生的一切继续写，绝不能把每回合当作独立战斗。',
      '先描写对手依据性格与战法作出的具体应对，再延伸双方招式碰撞、擂台环境变化、观众反应和气势消长。',
      'globalCommentary 要从整场比赛视角复盘因果：此前布局如何影响本回合、双方战略发生了什么改变、目前谁掌握主动。',
      '玩家创意越具体，效果越强，主打华丽爽快和以弱胜强；只有明显自相矛盾时才削弱效果。',
      '比赛固定三回合，前两回合不得结束。第三回合按累计得分决胜，同分判玩家胜。',
      `当前第${payload.turn}回合，比分：玩家${payload.scores.player}，对手${payload.scores.opponent}。`,
      `玩家资料：${JSON.stringify(payload.player)}。`,
      `对手资料：${JSON.stringify(payload.opponents)}。`,
      `此前全局战况摘要：${payload.battleSummary || '双方刚刚登台，尚未正式交锋。'}`,
      `此前完整战斗记录：\n${payload.battleHistory || '暂无'}`,
      `玩家本回合行动：${payload.move}`,
      '只返回 JSON，不要代码块。字段：opponentAction、narration、globalCommentary、battleSummary、tacticalHint、playerDelta、opponentDelta。',
      'globalCommentary 需有全局视角和连续性；battleSummary 用于下一回合承接；tacticalHint 给玩家明确的下一步突破口。',
      'playerDelta 0-45，opponentDelta 0-38。避免色情描写。'
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

  async function judge(active, move) {
    const opponents = active.opponentIds
      .map((id) => root.GameTournamentRoster.getProfile(id, active.roster))
      .filter(Boolean);
    const payload = {
      turn: active.turn + 1,
      move,
      player: root.GameTournamentRoster.getProfile('player', active.roster),
      opponents,
      scores: active.scores,
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
        maxTokens: 1400
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
