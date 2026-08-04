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

  function responseSpeaker(active) {
    const names = (active.opponentIds || []).map((id) => (
      (active.roster || []).find((profile) => profile.id === id)?.name
    )).filter(Boolean);
    return names.join('与') || '对手';
  }

  function stripLeadingLabel(value, label, maxLength) {
    let text = String(value || '').trim();
    while (label && text.startsWith(label)) {
      text = text.slice(label.length).replace(/^[：:\s]+/, '');
    }
    return text.slice(0, maxLength);
  }

  function applyExchange(active, move, result) {
    active.turn += 1;
    active.scores.player += Math.max(0, Math.floor(Number(result.playerDelta) || 0));
    active.scores.opponent += Math.max(0, Math.floor(Number(result.opponentDelta) || 0));
    const speaker = responseSpeaker(active);
    const response = stripLeadingLabel(result.response || result.summary, speaker, 320);
    const verdict = stripLeadingLabel(result.verdict, '裁判判决', 160);
    active.logs.push({ speaker: '你', text: String(move).slice(0, 500) });
    active.logs.push({
      speaker,
      kind: 'opponent-response',
      text: response
    });
    active.logs.push({
      speaker: '裁判判决',
      text: verdict
    });
    active.battleSummary = response || String(active.battleSummary).slice(0, 320);
  }

  function applyDecision(active, winnerId) {
    const playerWon = winnerId === 'player';
    const playerScore = Math.max(0, Number(active.scores?.player) || 0);
    const opponentScore = Math.max(0, Number(active.scores?.opponent) || 0);
    const winnerName = playerWon
      ? '你'
      : ((active.roster || []).find((entry) => entry.id === winnerId)?.name || '对手');
    active.logs.push({
      speaker: '裁判终判',
      text: `应你的请求，裁判核定${active.turn}回合累计点数：你 ${playerScore}，对手 ${opponentScore}。本轮由${winnerName}胜出。`
    });
  }

  root.GameTournamentBattleState = Object.freeze({ prepare, applyExchange, applyDecision });
}(window));
