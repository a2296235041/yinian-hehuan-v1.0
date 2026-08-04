'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

const html = read('publish/index.html');
const panel = read('publish/src/ui/TournamentPanel.js');
const view = read('publish/src/ui/TournamentView.js');
const system = read('publish/src/systems/TournamentSystem.js');

assert.ok(html.includes('<option value="tamper">篡改签文</option>'));
assert.ok(html.includes('id="tournament-opponent-select"'));
assert.ok(panel.includes('selectedOpponent()'));
assert.ok(panel.includes('篡改下一轮签文'));
assert.ok(view.includes('问鼎战三人同台'));
assert.ok(system.includes("speaker: '签表异动'"));

console.log('tournament matchmaking UI test passed');
