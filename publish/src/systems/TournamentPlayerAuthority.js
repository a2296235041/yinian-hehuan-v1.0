(function installTournamentPlayerAuthority(root) {
  'use strict';

  const validResults = new Set(['player', 'opponent', 'continue']);

  function hasTentativeLanguage(value) {
    return /(试图|尝试|准备|想要|打算|欲要|企图)/.test(value);
  }

  function detect(move) {
    const value = String(move || '').trim();
    const opponentWin = value.match(
      /(?:我被[^。！？]{0,18}(?:击败|打败|战胜)|我(?:当场|主动|选择|直接|故意|随即)?(?:认输|落败|战败|败北|输了)|(?:对手|敌手|她|他)[^。！？]{0,18}(?:击败|打败|战胜)我)/
    );
    if (opponentWin && !hasTentativeLanguage(opponentWin[0])) return 'opponent';
    const playerWin = value.match(
      /(?:我[^。！？]{0,20}(?:击败|打败|战胜)(?:了)?(?:对手|敌手|她|他|[\u4e00-\u9fa5]{2,6})|我(?:最终|成功|当场|随即)?(?:赢下|获胜|取胜)|(?:对手|敌手|她|他)[^。！？]{0,12}(?:认输|落败|战败|败北|倒下|失去战力))/
    );
    if (playerWin && !hasTentativeLanguage(playerWin[0])) return 'player';
    return 'continue';
  }

  function requested(value, move) {
    return validResults.has(value) && value !== 'continue' ? value : detect(move);
  }

  function resolve(payload, exchange, value) {
    let playerDelta = Math.max(0, Math.round(Number(exchange?.playerDelta) || 0));
    let opponentDelta = Math.max(0, Math.round(Number(exchange?.opponentDelta) || 0));
    const declaredResult = requested(value, payload?.move);
    const playerScore = Math.max(0, Number(payload?.scores?.player) || 0);
    const opponentScore = Math.max(0, Number(payload?.scores?.opponent) || 0);
    if (declaredResult === 'player') {
      playerDelta = Math.max(playerDelta, opponentScore + opponentDelta - playerScore + 1);
    } else if (declaredResult === 'opponent') {
      opponentDelta = Math.max(opponentDelta, playerScore + playerDelta - opponentScore + 1);
    }
    return {
      playerDelta,
      opponentDelta,
      declaredResult,
      finished: false,
      winner: 'ongoing'
    };
  }

  root.GameTournamentPlayerAuthority = Object.freeze({ detect, resolve });
}(window));
