(function installTournamentCombatBalance(root) {
  'use strict';

  const biases = Object.freeze({
    balanced: Object.freeze({ attack: 1, defense: 1, speed: 1, hp: 1 }),
    assault: Object.freeze({ attack: 1.14, defense: 0.9, speed: 1.04, hp: 0.94 }),
    swift: Object.freeze({ attack: 1.03, defense: 0.88, speed: 1.2, hp: 0.9 }),
    guard: Object.freeze({ attack: 0.9, defense: 1.2, speed: 0.84, hp: 1.16 }),
    control: Object.freeze({ attack: 0.97, defense: 1.08, speed: 1.02, hp: 1.06 })
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
  }

  function decorate(profile) {
    const power = clamp(profile?.power || 50, 1, 200);
    const bias = biases[profile?.combat_bias] || biases.balanced;
    return {
      ...profile,
      power,
      combat_bias: biases[profile?.combat_bias] ? profile.combat_bias : 'balanced',
      maxHp: Math.round((70 + power * 3.3) * bias.hp),
      attack: Math.round((18 + power * 0.5) * bias.attack),
      defense: Math.round((3 + power * 0.18) * bias.defense),
      speed: Math.round((8 + power * 0.16) * bias.speed)
    };
  }

  function playerProfile(stats) {
    return {
      power: clamp(stats?.combatPower || 45, 1, 200),
      maxHp: Math.max(1, Math.round(Number(stats?.maxHp) || 1)),
      attack: Math.max(1, Math.round(Number(stats?.attack) || 1)),
      defense: Math.max(0, Math.round(Number(stats?.defense) || 0)),
      speed: Math.max(1, Math.round(Number(stats?.speed) || 1)),
      combat_bias: 'player'
    };
  }

  function averageOpponentPower(payload) {
    const opponents = Array.isArray(payload?.opponents) ? payload.opponents : [];
    if (!opponents.length) return 50;
    return opponents.reduce((sum, profile) => sum + (Number(profile?.power) || 50), 0)
      / opponents.length;
  }

  function adjustExchange(payload, proposedPlayer, proposedOpponent) {
    const playerPower = Number(payload?.player?.power) || 50;
    const opponentPower = averageOpponentPower(payload);
    const powerEdge = clamp((playerPower - opponentPower) / 4, -9, 9);
    const groupPressure = Math.max(0, (payload?.opponents?.length || 1) - 1) * 3;
    return {
      playerDelta: clamp(Number(proposedPlayer) + powerEdge - groupPressure, 0, 45),
      opponentDelta: clamp(Number(proposedOpponent) - powerEdge + groupPressure, 0, 38),
      playerPower,
      opponentPower: Math.round(opponentPower),
      powerEdge
    };
  }

  root.GameTournamentCombatBalance = Object.freeze({
    biases, decorate, playerProfile, adjustExchange
  });
}(window));
