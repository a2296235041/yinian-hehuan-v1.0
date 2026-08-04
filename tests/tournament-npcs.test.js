'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const records = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../publish/assets/data/tournament_npcs.json'),
  'utf8'
));

assert.equal(records.length, 16);
assert.equal(records.filter((entry) => entry.group === 'internal').length, 4);
assert.equal(records.filter((entry) => entry.group === 'external').length, 12);
assert.equal(new Set(records.map((entry) => entry.id)).size, 16);
const righteousSect = records.filter((entry) => entry.faction === '昭明道宗');
assert.deepEqual(
  righteousSect.map((entry) => entry.id),
  ['jiang_zhaoyue', 'gu_yunzheng', 'shen_jingchen']
);
assert.equal(records.some((entry) => entry.faction === '万兽岭'), false);
righteousSect.forEach((entry) => {
  const profile = [
    entry.title, entry.appearance, entry.physique, entry.personality,
    entry.combat_style, entry.signature_move
  ].join('');
  assert.doesNotMatch(profile, /兽|狼|熊|貂|灵宠|御兽|兽魂/);
});

records.forEach((entry) => {
  [
    'name', 'faction', 'title', 'appearance', 'physique', 'personality',
    'combat_style', 'signature_move', 'portrait_key'
  ].forEach((key) => assert.equal(typeof entry[key], 'string', `${entry.id}.${key}`));
  assert.equal(entry.adult, true);
  assert.ok(entry.power >= 1 && entry.power <= 120);
  assert.ok(['balanced', 'assault', 'swift', 'guard', 'control'].includes(entry.combat_bias));
});

console.log('tournament npc data test passed');
