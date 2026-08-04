(function installTournamentPlayerAuthority(root) {
  'use strict';

  const submissionTerms = '认输|投降|服输|求饶|讨饶|告饶|求她饶命|求他饶命|请求饶命';

  function surrendered(move) {
    const value = String(move || '').trim();
    const patterns = [
      new RegExp(`我[^，。！？]{0,8}(?:${submissionTerms})`, 'g'),
      new RegExp(
        `我[^，。！？]{0,20}(?:主动|选择|决定|愿意|只能|只好|当场|直接|随即|立刻|跪地)`
          + `[^。！？]{0,6}(?:${submissionTerms})`,
        'g'
      )
    ];
    return patterns.some((pattern) => Array.from(value.matchAll(pattern)).some((match) => {
      const termIndex = match[0].search(new RegExp(submissionTerms));
      const prefix = match[0].slice(0, Math.max(0, termIndex));
      return !/(不|绝不|不会|拒绝|并未|没有|未曾)/.test(prefix.slice(-8));
    }));
  }

  function detect(move) {
    return surrendered(move) ? 'opponent' : 'player';
  }

  function resolve(payload, exchange) {
    let playerDelta = Math.max(0, Math.round(Number(exchange?.playerDelta) || 0));
    let opponentDelta = Math.max(0, Math.round(Number(exchange?.opponentDelta) || 0));
    const declaredResult = detect(payload?.move);
    if (declaredResult === 'player') {
      playerDelta = Math.min(45, Math.max(playerDelta, opponentDelta + 5));
      opponentDelta = Math.min(opponentDelta, Math.max(0, playerDelta - 5));
    } else {
      opponentDelta = Math.min(38, Math.max(opponentDelta, playerDelta + 5));
      playerDelta = Math.min(playerDelta, Math.max(0, opponentDelta - 5));
    }
    return {
      playerDelta,
      opponentDelta,
      declaredResult,
      finished: false,
      winner: 'ongoing'
    };
  }

  root.GameTournamentPlayerAuthority = Object.freeze({ surrendered, detect, resolve });
}(window));
