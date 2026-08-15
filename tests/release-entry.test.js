'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const html = fs.readFileSync(path.join(__dirname, '../publish/index.html'), 'utf8');
const publishDirectory = path.join(__dirname, '../publish');
const manifest = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../tools/entry-sources.v067.json'),
  'utf8'
));
const bundle = fs.readFileSync(path.join(publishDirectory, 'main.v075.js'), 'utf8');
const version = '0.7.5';
const build = '20260815.16';
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
assert.deepEqual(
  [...html.matchAll(/<script defer src="([^"]+)"><\/script>/g)].map((match) => match[1]),
  ['./vendor/phaser.min.js', './main.v075.js?v=20260815-16']
);
assert.ok(html.includes('./cheat-panel.v021.css'));
assert.ok(html.includes('./tournament.v029.css'));
assert.ok(html.includes('./tournament-participants.v032.css'));
assert.ok(html.includes('./private-group-dialogue.v033.css'));
assert.ok(html.includes('<style data-critical-boot>'));
assert.ok(html.includes('GameEarlyBoot'));
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
  './src/systems/CombatStatFormula.js',
  './src/systems/TournamentCombatBalance.js',
  './src/systems/TournamentScoreSpread.js',
  './src/systems/TournamentPlayerAuthority.js',
  './src/systems/TournamentRules.js',
  './src/systems/TournamentBattleState.js',
  './src/systems/TournamentDecision.js',
  './src/systems/TournamentRelations.js',
  './src/systems/TournamentSystem.js',
  './src/ai/TournamentIntent.js',
  './src/ai/TournamentPrompt.js',
  './src/ai/TournamentOutput.js',
  './src/ai/TournamentResponseText.js',
  './src/ai/TournamentAttitude.js',
  './src/ai/TournamentVerdict.js',
  './src/ai/TournamentImage.js',
  './src/ai/TournamentJudge.js',
  './src/ui/TournamentParticipantView.v032.js',
  './src/ui/TournamentView.js',
  './src/ui/TournamentPanel.js',
  './src/ui/TournamentEntry.js',
  './src/ui/PrivateGroupDialoguePanel.v033.js',
  './src/ui/InventoryQuantityDialog.js',
  './src/ui/InventoryUseController.js',
  './src/ui/CommerceDecor.js',
  './src/assets/ItemIconAssets.js',
  './src/ui/InventoryGridView.js',
  './src/ui/TransitionMessageBox.js',
  './src/ui/ShopQuantityDialog.js',
  './src/ui/ShopPurchaseController.js',
  './src/ui/ShopGridView.js',
  './src/ui/TournamentPortraitModal.js',
  './src/assets/AssetUrl.js',
  './src/ai/TournamentCharacterImagePrompts.js',
  './src/ai/ImageDimensionSettings.js',
  './src/ui/PlayerStatusHeader.js',
  './src/ui/PlayerStatusView.js',
  './src/assets/GameScenePreload.v064.js',
  './src/boot/GameBootstrap.v064.js'
].forEach((entry) => {
  assert.ok(
    manifest.includes(entry.slice(2)),
    `${entry} should be bundled by the release entry`
  );
});
const sourceHash = crypto.createHash('sha256');
manifest.forEach((file) => {
  const fullPath = path.join(publishDirectory, file);
  assert.ok(fs.existsSync(fullPath), `${file} should exist`);
  sourceHash.update(path.relative(path.join(__dirname, '..'), fullPath));
  sourceHash.update('\0');
  sourceHash.update(fs.readFileSync(fullPath));
  sourceHash.update('\0');
});
assert.ok(bundle.startsWith(
  `/* release ${version} sources:${sourceHash.digest('hex').slice(0, 16)} */`
));
assert.ok(bundle.length < 500000, 'release entry should stay compact');
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
  './main.v033.js',
  './main.v034.js',
  './main.v035.js',
  './main.v036.js',
  './main.v037.js',
  './main.v038.js',
  './main.v039.js',
  './main.v040.js',
  './main.v041.js',
  './main.v042.js',
  './main.v043.js',
  './main.v044.js',
  './main.v045.js',
  './main.v046.js',
  './main.v047.js',
  './main.v048.js',
  './main.v049.js',
  './main.v050.js',
  './main.v051.js',
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
