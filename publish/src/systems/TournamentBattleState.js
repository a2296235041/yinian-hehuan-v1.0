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

  function responseText(result, speaker) {
    let value = String(result.response || result.summary || '').trim();
    while (speaker && value.startsWith(speaker)) {
      value = value.slice(speaker.length).trimStart();
    }
    return value.slice(0, 240);
  }

  function applyExchange(active, move, result) {
    active.turn += 1;
    active.scores.player += Math.max(0, Math.floor(Number(result.playerDelta) || 0));
    active.scores.opponent += Math.max(0, Math.floor(Number(result.opponentDelta) || 0));
    const speaker = responseSpeaker(active);
    const response = responseText(result, speaker);
    active.logs.push({ speaker: '你', text: String(move).slice(0, 500) });
    active.logs.push({
      speaker,
      kind: 'opponent-response',
      text: response
    });
    active.logs.push({
      speaker: '裁判判决',
      text: String(result.verdict || '').slice(0, 140)
    });
    active.battleSummary = response || String(active.battleSummary).slice(0, 240);
  }

  root.GameTournamentBattleState = Object.freeze({ prepare, applyExchange });
}(window));
