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

records.forEach((entry) => {
  [
    'name', 'faction', 'title', 'appearance', 'physique', 'personality',
    'combat_style', 'signature_move', 'portrait_key'
  ].forEach((key) => assert.equal(typeof entry[key], 'string', `${entry.id}.${key}`));
  assert.equal(entry.adult, true);
  assert.ok(entry.power >= 1 && entry.power <= 120);
});

console.log('tournament npc data test passed');
