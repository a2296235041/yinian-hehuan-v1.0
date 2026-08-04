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
    const declaredResult = detect(payload?.move);
    const spread = root.GameTournamentScoreSpread?.enforce?.(
      payload, exchange, declaredResult
    ) || exchange;
    return {
      playerDelta: Math.max(0, Math.min(45, Math.round(Number(spread?.playerDelta) || 0))),
      opponentDelta: Math.max(0, Math.min(38, Math.round(Number(spread?.opponentDelta) || 0))),
      declaredResult,
      finished: false,
      winner: 'ongoing'
    };
  }

  root.GameTournamentPlayerAuthority = Object.freeze({ surrendered, detect, resolve });
}(window));
