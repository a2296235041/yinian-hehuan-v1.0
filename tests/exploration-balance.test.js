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
const window = {};
const fixedMath = Object.create(Math);
fixedMath.random = () => 0.5;
const context = { window, Math: fixedMath, Number, Object };
vm.runInNewContext(combatSource, context);

function wins(stats, enemy) {
  const combat = new context.Game.Systems.CombatSystem(stats, enemy);
  for (let turn = 0; turn < 500 && !combat.over; turn += 1) combat.act('attack');
  return combat.snapshot().won;
}

let previousAttack = 0;
let previousHp = 0;
let previousGain = 0;
regions.forEach((region, index) => {
  assert.ok(region.recommended_attack > previousAttack);
  assert.ok(region.recommended_hp > previousHp);
  previousAttack = region.recommended_attack;
  previousHp = region.recommended_hp;
  region.loot_ids.forEach((id) => assert.ok(itemById.has(id), `missing region loot ${id}`));
  region.enemy_ids.forEach((id) => assert.ok(enemyById.has(id), `missing enemy ${id}`));
  if (index < 2) return;

  const regionEnemies = region.enemy_ids.map((id) => enemyById.get(id));
  const battleItems = regionEnemies.map((enemy) => itemById.get(enemy.loot_id));
  battleItems.forEach((item) => {
    assert.ok(item, `missing battle loot in ${region.name}`);
    assert.equal(item.type, 'attribute');
  });
  const gains = [...new Set(battleItems.map((item) => item.attribute_gain))];
  assert.equal(gains.length, 1, `${region.name} should have one reward tier`);
  assert.ok(gains[0] > previousGain, `${region.name} reward gain should increase`);
  previousGain = gains[0];

  const realm = Number(region.required_realm);
  const newlyUnlocked = {
    maxHp: 110 + realm * 70,
    attack: 16 + realm * 18,
    defense: 2 + realm * 3,
    speed: 12 + realm * 2
  };
  assert.ok(
    regionEnemies.some((enemy) => !wins(newlyUnlocked, enemy)),
    `${region.name} should stop a weak newly unlocked player`
  );
  const prepared = {
    maxHp: region.recommended_hp,
    attack: region.recommended_attack,
    defense: 8 + realm * 5,
    speed: 16 + realm * 4
  };
  assert.ok(
    regionEnemies.some((enemy) => wins(prepared, enemy)),
    `${region.name} should reward reaching its recommended stats`
  );
});

console.log('exploration balance test passed');
