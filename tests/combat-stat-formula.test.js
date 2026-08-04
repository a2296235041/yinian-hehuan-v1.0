'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function source(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

const window = {};
const fixedMath = Object.create(Math);
fixedMath.random = () => 0.5;
const context = { window, Math: fixedMath, Number, Object };
vm.runInNewContext(source('publish/src/systems/CombatStatFormula.js'), context);
vm.runInNewContext(source('publish/src/systems/TournamentCombatBalance.js'), context);
vm.runInNewContext(source('publish/src/systems/CombatSystem.js'), context);

const attributeNames = [
  'strength', 'constitution', 'agility', 'intelligence',
  'charisma', 'wisdom', 'luck'
];
const baseAttributes = Object.fromEntries(attributeNames.map((name) => [name, 60]));
const base = window.GameCombatStats.derive(baseAttributes, 2);

attributeNames.forEach((name) => {
  const improved = window.GameCombatStats.derive({
    ...baseAttributes,
    [name]: baseAttributes[name] + 100
  }, 2);
  assert.ok(
    ['maxHp', 'attack', 'defense', 'speed'].some((stat) => improved[stat] > base[stat]),
    `${name} should improve at least one combat stat`
  );
  assert.ok(improved.combatPower > base.combatPower, `${name} should improve combat power`);
});

const enemy = { name: '试炼傀儡', hp: 300, attack: 40, defense: 8, speed: 20 };
const slow = new context.Game.Systems.CombatSystem({
  maxHp: 300, attack: 60, defense: 10, speed: 10
}, enemy);
const fast = new context.Game.Systems.CombatSystem({
  maxHp: 300, attack: 60, defense: 10, speed: 35
}, enemy);
const slowAttack = slow.act('attack');
const fastAttack = fast.act('attack');
assert.ok(fastAttack.enemyHp < slowAttack.enemyHp, 'speed should improve attack tempo');
assert.ok(fastAttack.playerHp > slowAttack.playerHp, 'speed should reduce retaliation tempo');

const weakExchange = window.GameTournamentCombatBalance.adjustExchange({
  player: { power: 45 },
  opponents: [{ power: 75 }]
}, 20, 18);
const strongExchange = window.GameTournamentCombatBalance.adjustExchange({
  player: { power: 105 },
  opponents: [{ power: 75 }]
}, 20, 18);
assert.ok(strongExchange.playerDelta > weakExchange.playerDelta);
assert.ok(strongExchange.opponentDelta < weakExchange.opponentDelta);

console.log('combat stat formula test passed');
