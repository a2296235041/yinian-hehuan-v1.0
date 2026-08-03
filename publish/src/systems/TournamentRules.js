(function installTournamentRules(root) {
  'use strict';

  const STAGES = Object.freeze([
    Object.freeze({ label: '十二进六', size: 12 }),
    Object.freeze({ label: '六进三', size: 6 }),
    Object.freeze({ label: '三进一 · 问鼎战', size: 3 })
  ]);

  function shuffle(items, random = Math.random) {
    const result = items.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function weightedWinner(ids, roster, random = Math.random) {
    const profiles = ids.map((id) => roster.find((item) => item.id === id)).filter(Boolean);
    const total = profiles.reduce((sum, item) => sum + Math.max(1, Number(item.power) || 50), 0);
    let roll = random() * total;
    for (const profile of profiles) {
      roll -= Math.max(1, Number(profile.power) || 50);
      if (roll <= 0) return profile.id;
    }
    return profiles.at(-1)?.id || ids[0];
  }

  function makeMatches(entrantIds, stageIndex, roster, random = Math.random) {
    const ordered = shuffle(entrantIds, random);
    const groups = stageIndex === 2
      ? [ordered]
      : Array.from({ length: ordered.length / 2 }, (_, index) => (
        ordered.slice(index * 2, index * 2 + 2)
      ));
    return groups.map((participants, index) => {
      const playerMatch = participants.includes(root.GameTournamentRoster.PLAYER_ID);
      return {
        id: `round-${stageIndex + 1}-match-${index + 1}`,
        participants,
        playerMatch,
        status: playerMatch ? 'pending' : 'complete',
        winnerId: playerMatch ? null : weightedWinner(participants, roster, random)
      };
    });
  }

  function createRound(entrantIds, stageIndex, roster, random = Math.random) {
    const stage = STAGES[stageIndex];
    if (!stage || entrantIds.length !== stage.size) {
      throw new Error('赛事轮次人数不符合晋级规则');
    }
    const matches = makeMatches(entrantIds, stageIndex, roster, random);
    const playerMatch = matches.find((match) => match.playerMatch);
    return {
      stageIndex,
      label: stage.label,
      entrantIds: entrantIds.slice(),
      matches,
      playerMatchId: playerMatch?.id || null
    };
  }

  function resolvePlayerMatch(round, winnerId) {
    const match = round.matches.find((entry) => entry.id === round.playerMatchId);
    if (!match) throw new Error('未找到玩家所在对局');
    match.status = 'complete';
    match.winnerId = winnerId;
    return round.matches.map((entry) => entry.winnerId).filter(Boolean);
  }

  function simulateChampion(entrantIds, stageIndex, roster, random = Math.random) {
    let ids = entrantIds.slice();
    let index = stageIndex;
    while (ids.length > 1) {
      if (ids.length === 3) return weightedWinner(ids, roster, random);
      const round = createRound(ids, index, roster, random);
      ids = round.matches.map((match) => (
        match.winnerId || weightedWinner(match.participants, roster, random)
      ));
      index += 1;
    }
    return ids[0] || null;
  }

  root.GameTournamentRules = Object.freeze({
    STAGES,
    createRound,
    resolvePlayerMatch,
    simulateChampion,
    weightedWinner
  });
}(window));
