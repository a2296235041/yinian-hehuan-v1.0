(function installTournamentBattleState(root) {
  'use strict';

  function prepare(active, match) {
    active.phase = 'battle';
    active.turn = 0;
    active.scores = { player: 0, opponent: 0 };
    active.battleSummary = '双方登上擂台，阵法封闭四周，第一回合尚未正式交锋。';
    active.logs = [{
      speaker: '裁判',
      text: active.stageIndex === 2
        ? '问鼎战开始。你需在三人混战中压服另外两位天骄。'
        : '双方登台，护山阵法已开启。请施展你的第一招。'
    }];
    active.opponentIds = (match?.participants || []).filter((id) => id !== 'player');
  }

  function applyExchange(active, move, result) {
    active.turn += 1;
    active.scores.player += Math.max(0, Math.floor(Number(result.playerDelta) || 0));
    active.scores.opponent += Math.max(0, Math.floor(Number(result.opponentDelta) || 0));
    active.logs.push({ speaker: '你', text: String(move).slice(0, 500) });
    active.logs.push({ speaker: '对手', text: String(result.opponentAction || '').slice(0, 300) });
    active.logs.push({ speaker: '战局', text: String(result.narration || '').slice(0, 900) });
    active.logs.push({
      speaker: '全局战报',
      text: String(result.globalCommentary || result.commentary || '').slice(0, 900)
    });
    active.logs.push({
      speaker: '破局提示',
      text: String(result.tacticalHint || '').slice(0, 240)
    });
    active.battleSummary = String(result.battleSummary || active.battleSummary).slice(0, 600);
  }

  root.GameTournamentBattleState = Object.freeze({ prepare, applyExchange });
}(window));
