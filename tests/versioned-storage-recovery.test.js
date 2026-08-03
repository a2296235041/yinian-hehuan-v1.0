'use strict';

const assert = require('node:assert/strict');

global.window = globalThis;
global.PlatformBridge = { getLocalStorage: () => null };
require('../publish/src/storage/VersionedStorageUtils.js');
require('../publish/src/storage/VersionedStorage.js');

let releaseFirstWrite;
let savedValue = null;
let writeCount = 0;
const firstWrite = new Promise((resolve) => {
  releaseFirstWrite = resolve;
});
const store = {
  get: async () => savedValue,
  put: async (_key, value) => {
    writeCount += 1;
    if (writeCount === 1) await firstWrite;
    savedValue = value;
  },
  delete: async () => {
    savedValue = null;
  }
};

global.dzmm = {
  kv: {
    namespace: () => store
  }
};

async function run() {
  const storage = GamefyRecipes.createVersionedStorage({
    namespace: 'test:',
    key: 'save',
    version: 1,
    fallback: null,
    migrations: { 0: (value) => value },
    sanitize: (value) => value,
    writeTimeoutMs: 100
  });

  const firstResult = await storage.save({ day: 1 }, { flush: true });
  assert.equal(firstResult.remote, false);

  const retry = storage.save({ day: 2 }, { flush: true });
  setTimeout(releaseFirstWrite, 20);
  const secondResult = await retry;
  assert.equal(secondResult.remote, true);
  assert.equal(savedValue.data.day, 2);
  assert.equal(writeCount, 2);
}

run().then(() => {
  console.log('versioned storage recovery tests passed');
}).catch((error) => {
  console.error(error.message, error.stack);
  process.exitCode = 1;
});
