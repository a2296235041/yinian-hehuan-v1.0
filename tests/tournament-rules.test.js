'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/TournamentRules.js'),
  'utf8'
);
const window = {
  GameTournamentRoster: { PLAYER_ID: 'player' }
};
vm.runInNewContext(source, { window, Math });

const rules = window.GameTournamentRules;
const roster = Array.from({ length: 12 }, (_, index) => ({
  id: index === 0 ? 'player' : `npc-${index}`,
  name: index === 0 ? '你' : `NPC ${index}`,
  power: 50 + index
}));
const noShuffle = () => 0.999999;

const first = rules.createRound(roster.map((entry) => entry.id), 0, roster, noShuffle);
assert.equal(first.label, '十二进六');
assert.equal(first.matches.length, 6);
assert.equal(first.matches.filter((match) => match.playerMatch).length, 1);
const tampered = rules.createRound(
  roster.map((entry) => entry.id), 0, roster, noShuffle, 'npc-7'
);
const tamperedMatch = tampered.matches.find((match) => match.playerMatch);
assert.deepEqual(Array.from(tamperedMatch.participants), ['player', 'npc-7']);

const six = rules.resolvePlayerMatch(first, 'player');
assert.equal(six.length, 6);
assert.ok(six.includes('player'));

const second = rules.createRound(six, 1, roster, noShuffle);
assert.equal(second.label, '六进三');
assert.equal(second.matches.length, 3);
const three = rules.resolvePlayerMatch(second, 'player');
assert.equal(three.length, 3);

const final = rules.createRound(three, 2, roster, noShuffle);
assert.equal(final.label, '三进一 · 问鼎战');
assert.equal(final.matches.length, 1);
assert.equal(final.matches[0].participants.length, 3);
assert.equal(final.matches[0].playerMatch, true);
assert.deepEqual(Array.from(rules.resolvePlayerMatch(final, 'player')), ['player']);

const champion = rules.simulateChampion(
  roster.slice(1, 7).map((entry) => entry.id),
  1,
  roster,
  noShuffle
);
assert.equal(typeof champion, 'string');

console.log('tournament rules test passed');
