(function installTournamentJudge(root) {
  'use strict';

  function actionId(eventId, turn) {
    const random = root.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${eventId}-${turn}-${random}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
  }

  function deterministicFallback(payload) {
    const lengthBonus = Math.min(12, Math.floor(payload.move.length / 24));
    const playerDelta = 20 + lengthBonus + Math.floor(Math.random() * 6);
    const opponentDelta = 7 + Math.floor(Math.random() * 10);
    const finished = payload.turn >= 3;
    const playerTotal = payload.scores.player + playerDelta;
    const opponentTotal = payload.scores.opponent + opponentDelta;
    const names = payload.opponents.map((item) => item.name).join('与');
    return {
      opponentAction: `${names}迅速变招，试图封住你的后路。`,
      narration: `你的招式在擂台上轰然展开，灵压层层推进，${names}虽强行稳住身形，仍被逼得暂避锋芒。`,
      commentary: finished ? '三招已过，本场依照双方累计优势裁定。' : '你已抢到先机，可以继续追击。',
      playerDelta,
      opponentDelta,
      finished,
      winner: finished && playerTotal < opponentTotal ? 'opponent' : (finished ? 'player' : 'ongoing'),
      fallback: true
    };
  }

  async function judge(active, move) {
    const opponents = active.opponentIds
      .map((id) => root.GameTournamentRoster.getProfile(id, active.roster))
      .filter(Boolean);
    const payload = {
      actionId: actionId(active.id, active.turn + 1),
      eventId: active.id,
      turn: active.turn + 1,
      move,
      player: root.GameTournamentRoster.getProfile('player', active.roster),
      opponents,
      scores: active.scores,
      recentLogs: active.logs.slice(-6).map((entry) => `${entry.speaker}：${entry.text}`).join('\n')
    };
    try {
      const result = await root.dzmm?.fn?.invoke?.('tournament-judge', payload);
      if (!result || typeof result !== 'object') throw new Error('AI 裁决返回为空');
      return result;
    } catch (error) {
      console.error('武道裁决失败:', error?.code || '', error?.message || '未知错误', error?.stack || '');
      return {
        ...deterministicFallback(payload),
        errorCode: error?.code || 'FALLBACK'
      };
    }
  }

  root.GameTournamentJudge = Object.freeze({ judge });
}(window));
