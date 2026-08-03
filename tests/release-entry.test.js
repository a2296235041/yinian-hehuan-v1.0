'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../publish/index.html'), 'utf8');
const publishDirectory = path.join(__dirname, '../publish');
const version = '0.3.3';
const build = '20260803.8';
const cacheName = `yinian-hehuan-v${version}-${build}`;
const expectedEntry = `main.v${version.replaceAll('.', '')}.js`;
const releaseEntries = fs.readdirSync(publishDirectory)
  .filter((name) => /^main\.v\d+\.js$/.test(name));

assert.match(html, new RegExp(`name="game-version" content="${version.replaceAll('.', '\\.')}"`));
assert.match(html, new RegExp(`build: '${build}'`));
assert.match(html, new RegExp(`cacheName: '${cacheName}'`));
assert.match(html, new RegExp(`entry: '${expectedEntry.replaceAll('.', '\\.')}'`));
assert.ok(html.includes(`./${expectedEntry}`));
assert.deepEqual(releaseEntries, [expectedEntry]);
assert.ok(html.includes('./src/ai/AIImageService.v021.js'));
assert.ok(html.includes('./src/assets/PlayerPortraitAssets.v002.js'));
assert.ok(html.includes('./src/scenes/PreloadScene.v025.js'));
assert.ok(html.includes('./src/scenes/CharacterCreationScene.v017.js'));
assert.ok(html.includes('./src/scenes/BattleScene.v023.js'));
assert.ok(html.includes('./src/scenes/InventoryScene.v021.js'));
assert.ok(html.includes('./src/systems/CheatSystem.v021.js'));
assert.ok(html.includes('./src/ui/CheatPanel.v021.js'));
assert.ok(html.includes('./cheat-panel.v021.css'));
assert.ok(html.includes('./tournament.v029.css'));
assert.ok(html.includes('./tournament-participants.v032.css'));
assert.ok(html.includes('./private-group-dialogue.v033.css'));
assert.ok(
  html.includes('./layout.v015.css'),
  'release entry should load the mobile layout override'
);
[
  './src/storage/DialogueHistoryState.v024.js',
  './src/storage/TournamentState.js',
  './src/ai/AIService.v016.js',
  './src/ai/AIJson.js',
  './src/ai/PrivateGroupPrompts.v033.js',
  './src/ai/PrivateGroupDialogueService.v033.js',
  './src/ai/DialoguePanel.v014.js',
  './src/ui/ExplorationPanel.v014.js',
  './src/ui/ExplorationDOMController.v023.js',
  './src/scenes/ExplorationScene.v023.js',
  './src/data/TournamentRoster.js',
  './src/systems/TournamentRules.js',
  './src/systems/TournamentBattleState.js',
  './src/systems/TournamentRelations.js',
  './src/systems/TournamentSystem.js',
  './src/ai/TournamentJudge.js',
  './src/ui/TournamentParticipantView.v032.js',
  './src/ui/TournamentView.js',
  './src/ui/TournamentPanel.js',
  './src/ui/TournamentEntry.js',
  './src/ui/PrivateGroupDialoguePanel.v033.js',
  './main.v033.js'
].forEach((entry) => {
  assert.ok(
    html.includes(entry),
    `${entry} should be loaded by the release entry`
  );
});
assert.ok(!html.includes('DialogueInput.js'), 'removed input dispatcher must not be loaded');
assert.ok(!html.includes('<form id="exploration-command-panel"'));
[
  './src/ai/AIService.js',
  './src/ai/AIService.v014.js',
  './src/ai/AIService.v015.js',
  './src/storage/DialogueHistoryState.v023.js',
  './src/storage/DialogueHistoryState.v022.js',
  './src/ai/DialoguePanel.js',
  './src/ui/ExplorationPanel.js',
  './src/ui/ExplorationDOMController.js',
  './src/scenes/ExplorationScene.js',
  './main.js',
  './main.v014.js',
  './main.v016.js',
  './main.v018.js',
  './main.v021.js',
  './main.v024.js',
  './main.v025.js',
  './main.v026.js',
  './main.v027.js',
  './main.v028.js',
  './main.v029.js',
  './main.v030.js',
  './main.v031.js',
  './main.v032.js',
  './src/ui/TournamentOpponentView.v031.js',
  './src/ai/AIImageService.js',
  './src/scenes/CharacterCreationScene.js',
  './src/scenes/CharacterCreationScene.v016.js',
  './src/scenes/PreloadScene.js',
  './src/scenes/BattleScene.js',
  './src/assets/PlayerPortraitAssets.js',
  './src/scenes/InventoryScene.js',
  './src/systems/SaveGameSystem.js'
].forEach((oldEntry) => {
  assert.ok(!html.includes(`src="${oldEntry}`), `${oldEntry} must not be loaded`);
});

console.log('release entry references test passed');
