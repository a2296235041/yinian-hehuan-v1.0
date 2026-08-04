'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/ui/TransitionMessageBox.js'),
  'utf8'
);
const uiScene = fs.readFileSync(
  path.join(__dirname, '../publish/src/scenes/UIScene.js'),
  'utf8'
);
const window = { Game: {} };

vm.runInNewContext(source, { window, Math, Object });

assert.equal(window.Game.TransitionMessageBox.heightFor(20), 96);
assert.equal(window.Game.TransitionMessageBox.heightFor(100), 158);
assert.equal(window.Game.TransitionMessageBox.heightFor(400), 270);
assert.ok(source.includes('setPosition(640, 360)'));
assert.ok(source.includes('strokeRoundedRect'));
assert.ok(source.includes("const MIN_HEIGHT = 96"));
assert.ok(uiScene.includes('Game.TransitionMessageBox.create(this)'));
assert.ok(!uiScene.includes('fixedHeight: 180'));

console.log('transition message box test passed');
