(function installTournamentDecision(root) {
  'use strict';

  const MIN_TURNS = 10;

  function profile(active, id) {
    return (active.roster || []).find((entry) => entry.id === id) || null;
  }

  function strongestOpponent(active) {
    return (active.opponentIds || []).reduce((best, id) => {
      const candidate = profile(active, id);
      return !best || Number(candidate?.power) > Number(best?.power) ? candidate : best;
    }, null);
  }

  function selectWinner(active) {
    const playerScore = Math.max(0, Number(active?.scores?.player) || 0);
    const opponentScore = Math.max(0, Number(active?.scores?.opponent) || 0);
    if (playerScore !== opponentScore) {
      return playerScore > opponentScore ? 'player' : strongestOpponent(active)?.id;
    }
    const playerPower = Math.max(1, Number(profile(active, 'player')?.power) || 1);
    const opponents = (active.opponentIds || []).map((id) => profile(active, id)).filter(Boolean);
    const averagePower = opponents.reduce(
      (sum, entry) => sum + Math.max(1, Number(entry.power) || 1), 0
    ) / Math.max(1, opponents.length);
    return playerPower >= averagePower ? 'player' : strongestOpponent(active)?.id;
  }

  function complete(state, active, winnerId, day) {
    const winners = root.GameTournamentRules.resolvePlayerMatch(active.round, winnerId);
    if (winnerId !== 'player') {
      active.championId = root.GameTournamentRules.simulateChampion(
        winners, active.stageIndex + 1, active.roster
      );
      active.playerWon = false;
      active.phase = 'event_complete';
      state.cooldowns[active.mode] = day + 10;
    } else if (active.stageIndex === 2) {
      active.championId = 'player';
      active.playerWon = true;
      active.phase = 'event_complete';
      state.cooldowns[active.mode] = day + 10;
    } else {
      active.pendingEntrants = winners;
      active.phase = 'round_complete';
    }
    return winnerId;
  }

  root.GameTournamentDecision = Object.freeze({
    MIN_TURNS,
    canRequest: (active) => active?.phase === 'battle' && Number(active.turn) >= MIN_TURNS,
    selectWinner,
    complete
  });
}(window));
