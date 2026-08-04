'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/TournamentDecision.js'),
  'utf8'
);
const window = {};
vm.runInNewContext(source, { window, Math, Number });

const decision = window.GameTournamentDecision;
assert.equal(decision.MIN_TURNS, 5);
assert.equal(decision.canRequest({ phase: 'battle', turn: 4 }), false);
assert.equal(decision.canRequest({ phase: 'battle', turn: 5 }), true);
assert.equal(decision.canRequest({ phase: 'round_complete', turn: 5 }), false);

console.log('tournament decision test passed');
