(function installCombatStatFormula(root) {
  'use strict';

  function value(attributes, key) {
    return Math.max(0, Number(attributes?.[key]) || 0);
  }

  function derive(attributes, realmIndex = 0, bonuses = {}) {
    const realm = Math.max(0, Math.floor(Number(realmIndex) || 0));
    const strength = value(attributes, 'strength');
    const constitution = value(attributes, 'constitution');
    const agility = value(attributes, 'agility');
    const intelligence = value(attributes, 'intelligence');
    const charisma = value(attributes, 'charisma');
    const wisdom = value(attributes, 'wisdom');
    const luck = value(attributes, 'luck');
    const maxHp = Math.round(
      45 + realm * 85 + constitution + strength * 0.2 + wisdom * 0.1
    );
    const attack = Math.round(
      3 + realm * 18 + strength * 0.2 + intelligence * 0.04
      + wisdom * 0.03 + luck * 0.02 + charisma * 0.01
    );
    const defense = Math.round(
      realm * 4 + constitution * 0.06 + wisdom * 0.025 + agility * 0.015
      + intelligence * 0.01 + charisma * 0.015
    );
    const speed = Math.round(
      5 + realm * 3 + agility * 0.1 + intelligence * 0.02 + luck * 0.025
      + wisdom * 0.01 + charisma * 0.01 + (Number(bonuses.speed) || 0)
    );
    const combatPower = Math.round(
      30 + realm * 4 + attack * 0.25 + defense * 0.5
      + speed * 0.35 + maxHp * 0.025
    );
    return {
      maxHp: Math.max(1, maxHp),
      attack: Math.max(1, attack),
      defense: Math.max(0, defense),
      speed: Math.max(1, speed),
      combatPower: Math.max(1, combatPower)
    };
  }

  root.GameCombatStats = Object.freeze({ derive });
}(window));
