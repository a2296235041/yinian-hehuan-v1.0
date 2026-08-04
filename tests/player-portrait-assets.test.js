'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/assets/PlayerPortraitAssets.v002.js'),
  'utf8'
);
const listeners = new Map();
let queued = 0;
let started = 0;
let loaded = false;
const load = {
  on(name, handler) {
    const handlers = listeners.get(name) || new Set();
    handlers.add(handler);
    listeners.set(name, handlers);
  },
  off(name, handler) {
    listeners.get(name)?.delete(handler);
  },
  image() {
    queued += 1;
  },
  isLoading() {
    return false;
  },
  start() {
    started += 1;
    queueMicrotask(() => {
      loaded = true;
      listeners.get('filecomplete')?.forEach((handler) => {
        handler('player-hehuan-descendant');
      });
    });
  }
};
const window = { Game: {} };
vm.runInNewContext(source, { window, Map, Promise, Error, Math });

(async () => {
  const scene = {
    load,
    textures: { exists: () => loaded }
  };
  const assets = window.Game.PlayerPortraitAssets;
  const first = assets.ensureLoaded(scene, 'secret_guard_descendant');
  const second = assets.ensureLoaded(scene, 'secret_guard_descendant');
  assert.equal(first, second);
  assert.equal(await first, 'player-hehuan-descendant');
  assert.equal(queued, 1);
  assert.equal(started, 1);
  assert.equal(await assets.ensureLoaded(scene, 'secret_guard_descendant'),
    'player-hehuan-descendant');
  assert.equal(queued, 1);
  console.log('player portrait asset loading test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
