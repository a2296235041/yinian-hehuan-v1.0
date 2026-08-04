'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/TournamentScoreSpread.js'),
  'utf8'
);
const window = {};
vm.runInNewContext(source, { window, Math, Object });

const spread = window.GameTournamentScoreSpread;

function resolve(move, playerDelta = 20, opponentDelta = 20, result = 'player') {
  return spread.enforce({ move }, { playerDelta, opponentDelta }, result);
}

const ordinary = resolve('我挥剑向前进攻。');
assert.ok(ordinary.playerDelta - ordinary.opponentDelta >= 5);
assert.ok(ordinary.playerDelta - ordinary.opponentDelta <= 7);

const tactical = resolve('我以身法闪避后抢占中线。');
assert.ok(tactical.playerDelta - tactical.opponentDelta >= 8);
assert.ok(tactical.playerDelta - tactical.opponentDelta <= 11);

const controlled = resolve('我破开她的招式，将她制住并牢牢压制。');
assert.ok(controlled.playerDelta - controlled.opponentDelta >= 12);
assert.ok(controlled.playerDelta - controlled.opponentDelta <= 18);

const overwhelming = resolve('我一剑将她彻底击败，令她倒地不起。');
assert.ok(overwhelming.playerDelta - overwhelming.opponentDelta >= 20);
assert.ok(overwhelming.playerDelta - overwhelming.opponentDelta <= 30);

const surrendered = resolve('我主动认输。', 40, 3, 'opponent');
assert.ok(surrendered.opponentDelta - surrendered.playerDelta >= 18);
assert.ok(surrendered.opponentDelta - surrendered.playerDelta <= 28);

const adverseButValid = resolve('我被她击倒在擂台边缘，但没有认输。');
assert.equal(adverseButValid.tier, 'adverse');
assert.ok(adverseButValid.playerDelta - adverseButValid.opponentDelta <= 7);

const preserved = resolve('我以剑光压制她。', 42, 4);
assert.equal(preserved.playerDelta, 42);
assert.equal(preserved.opponentDelta, 4);

const cappedPlayer = resolve('我将她彻底击败。', 2, 38);
assert.ok(cappedPlayer.playerDelta <= 45);
assert.ok(cappedPlayer.opponentDelta <= 38);
assert.ok(cappedPlayer.playerDelta - cappedPlayer.opponentDelta >= 20);

const cappedOpponent = resolve('我主动投降。', 45, 1, 'opponent');
assert.ok(cappedOpponent.playerDelta <= 45);
assert.ok(cappedOpponent.opponentDelta <= 38);
assert.ok(cappedOpponent.opponentDelta - cappedOpponent.playerDelta >= 18);

console.log('tournament score spread test passed');
