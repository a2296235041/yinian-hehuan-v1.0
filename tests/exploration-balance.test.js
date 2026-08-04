'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
}

const regions = readJson('publish/assets/data/exploration_regions.json');
const enemies = readJson('publish/assets/data/enemies.json');
const items = readJson('publish/assets/data/items.json');
const enemyById = new Map(enemies.map((enemy) => [enemy.id, enemy]));
const itemById = new Map(items.map((item) => [item.id, item]));
const combatSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/CombatSystem.js'),
  'utf8'
);
const formulaSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/CombatStatFormula.js'),
  'utf8'
);
const window = {};
const fixedMath = Object.create(Math);
fixedMath.random = () => 0.5;
const context = { window, Math: fixedMath, Number, Object };
vm.runInNewContext(formulaSource, context);
vm.runInNewContext(combatSource, context);

function wins(stats, enemy) {
  const combat = new context.Game.Systems.CombatSystem(stats, enemy);
  for (let turn = 0; turn < 500 && !combat.over; turn += 1) combat.act('attack');
  return combat.snapshot().won;
}

let previousAttack = 0;
let previousHp = 0;
let previousDefense = 0;
let previousSpeed = 0;
let previousGain = 0;
regions.forEach((region, index) => {
  assert.ok(region.recommended_attack > previousAttack);
  assert.ok(region.recommended_hp > previousHp);
  assert.ok(region.recommended_defense > previousDefense);
  assert.ok(region.recommended_speed > previousSpeed);
  previousAttack = region.recommended_attack;
  previousHp = region.recommended_hp;
  previousDefense = region.recommended_defense;
  previousSpeed = region.recommended_speed;
  region.loot_ids.forEach((id) => assert.ok(itemById.has(id), `missing region loot ${id}`));
  region.enemy_ids.forEach((id) => assert.ok(enemyById.has(id), `missing enemy ${id}`));

  const regionEnemies = region.enemy_ids.map((id) => enemyById.get(id));
  const realm = Number(region.required_realm);
  const newlyUnlocked = window.GameCombatStats.derive({
    strength: 60,
    constitution: 60,
    agility: 60,
    intelligence: 60,
    charisma: 60,
    wisdom: 60,
    luck: 60
  }, realm);
  const unlockedWins = regionEnemies.filter((enemy) => wins(newlyUnlocked, enemy)).length;
  if (index < 2) {
    assert.equal(unlockedWins, regionEnemies.length, `${region.name} should stay welcoming`);
    return;
  }

  const battleItems = regionEnemies.map((enemy) => itemById.get(enemy.loot_id));
  battleItems.forEach((item) => {
    assert.ok(item, `missing battle loot in ${region.name}`);
    assert.equal(item.type, 'attribute');
  });
  const gains = [...new Set(battleItems.map((item) => item.attribute_gain))];
  assert.equal(gains.length, 1, `${region.name} should have one reward tier`);
  assert.ok(gains[0] > previousGain, `${region.name} reward gain should increase`);
  previousGain = gains[0];

  assert.ok(unlockedWins <= 2, `${region.name} should stop a weak newly unlocked player`);
  const prepared = {
    maxHp: region.recommended_hp,
    attack: region.recommended_attack,
    defense: region.recommended_defense,
    speed: region.recommended_speed
  };
  assert.ok(
    regionEnemies.filter((enemy) => wins(prepared, enemy)).length >= 2,
    `${region.name} should reward reaching its recommended stats`
  );
});

console.log('exploration balance test passed');
