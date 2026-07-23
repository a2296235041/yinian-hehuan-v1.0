(function installPlayerStatsSystem(root) {
  'use strict';

  const attributeScale = {
    '较弱': 40,
    '中等': 60,
    '极强': 80
  };

  function valueOf(attributes, key) {
    const base = attributeScale[attributes?.[key]] || 50;
    return base + (root.GamePlayerGrowth?.getBonus(key) || 0);
  }

  // 身份属性是稳定的基础值，境界则同步提高实战属性。
  function getSnapshot() {
    const origin = root.Game.player?.origin || {};
    const attributes = origin.attributes || {};
    const cultivation = root.GameCultivation.getSnapshot();
    const strength = valueOf(attributes, 'strength');
    const constitution = valueOf(attributes, 'constitution');
    const agility = valueOf(attributes, 'agility');
    const intelligence = valueOf(attributes, 'intelligence');
    const wisdom = valueOf(attributes, 'wisdom');
    const luck = valueOf(attributes, 'luck');
    return {
      originName: origin.name || '无名弟子',
      realmIndex: cultivation.realmIndex,
      realmLabel: cultivation.label,
      strength,
      constitution,
      agility,
      intelligence,
      wisdom,
      luck,
      maxHp: 70 + constitution + cultivation.realmIndex * 70,
      attack: 8 + Math.round(strength * 0.2) + cultivation.realmIndex * 18,
      defense: Math.round(constitution * 0.06) + cultivation.realmIndex * 3,
      speed: 8 + Math.round(agility * 0.1) + cultivation.realmIndex * 2
    };
  }

  root.GamePlayerStats = { getSnapshot };
}(window));
