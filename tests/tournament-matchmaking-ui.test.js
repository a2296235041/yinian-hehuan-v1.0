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
const tournamentCss = read('publish/tournament.v029.css');
const style = read('publish/style.css');

assert.ok(html.includes('<option value="tamper">篡改签文</option>'));
assert.ok(html.includes('id="tournament-opponent-select"'));
assert.ok(html.includes('id="tournament-decision"'));
assert.ok(html.includes('id="tournament-draw-moment"'));
assert.ok(html.includes('id="draw-dimension"'));
assert.ok(panel.includes('selectedOpponent()'));
assert.ok(panel.includes('篡改下一轮签文'));
assert.ok(panel.includes('requestDecision()'));
assert.ok(panel.includes('GameTournamentImage.generate'));
assert.ok(view.includes('问鼎战三人同台'));
assert.ok(view.includes('GameTournamentDecision.MIN_TURNS'));
assert.ok(view.includes("'tournament-draw-moment'"));
assert.ok(read('publish/src/ai/ModelUI.js').includes('setDimension'));
assert.ok(read('publish/src/ai/AIImageService.v021.js').includes("|| '2:3'"));
assert.ok(system.includes("speaker: '签表异动'"));
assert.ok(tournamentCss.includes('.tournament-draw-moment'));
assert.match(style, /\.ai-image-modal\s*\{[^}]*z-index:\s*120/s);

console.log('tournament matchmaking UI test passed');
