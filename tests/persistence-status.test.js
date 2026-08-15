'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/storage/PersistenceStatus.js'),
  'utf8'
);
const warnings = [];
const toasts = [];
const window = {
  Game: { EventBus: { emit: (name, payload) => warnings.push({ name, payload }) } },
  dzmm: { toast: { warning: (message) => toasts.push(message) } }
};

vm.runInNewContext(source, { window, Date, console });

const synced = window.GamePersistenceStatus.result('物品变更', true, true, { quantity: 2 });
assert.equal(synced.quantity, 2);
assert.equal(synced.changed, true);
assert.equal(synced.durable, true);
assert.equal(synced.syncState, 'synced');
assert.equal(synced.syncMessage, '');

const localOnly = window.GamePersistenceStatus.result('物品变更', true, false, { quantity: 3 });
assert.equal(localOnly.syncState, 'local_only');
assert.equal(localOnly.durable, false);
assert.match(localOnly.syncMessage, /尚未同步到线上/);

const combined = window.GamePersistenceStatus.combine('探索奖励', [
  { changed: true, durable: true },
  { changed: true, durable: false }
], { spiritStones: 10 });
assert.equal(combined.changed, true);
assert.equal(combined.durable, false);
assert.equal(combined.syncState, 'local_only');
assert.equal(combined.spiritStones, 10);

window.GamePersistenceStatus.report('探索奖励', localOnly);
window.GamePersistenceStatus.report('探索奖励', localOnly);
assert.equal(warnings.length, 1);
assert.equal(toasts.length, 1);
console.log('persistence status test passed');
