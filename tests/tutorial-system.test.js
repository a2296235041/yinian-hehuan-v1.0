'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/TutorialSystem.v001.js'),
  'utf8'
);
const listeners = new Map();
const shown = [];
const window = {
  Game: {
    EventBus: {
      on(name, listener) {
        listeners.set(name, listener);
      }
    }
  },
  GameTutorialState: {
    async load() {
      return { started: false, completed: false, step: 0 };
    },
    save(value) {
      return Promise.resolve(value);
    }
  },
  GameTutorialOverlay: {
    create() {},
    show(value) { shown.push(value); },
    hide() {}
  },
  GameAudio: { sfx() {} }
};

function emit(name, value) {
  listeners.get(name)?.(value);
}

function flush() {
  return Promise.resolve().then(() => Promise.resolve());
}

(async () => {
  vm.runInNewContext(source, { window, Promise, Object, Math, Number, Boolean });
  window.GameTutorial.init();
  emit('tutorial-game-ready', { newGame: true });
  await flush();
  assert.equal(shown.at(-1).progress, '1 / 10');

  emit('tutorial-building-opened', { id: 'welcome-pavilion' });
  assert.equal(shown.at(-1).progress, '2 / 10');
  emit('ai-dialogue-open', { npcId: 'su_meier' });
  assert.equal(shown.at(-1).progress, '3 / 10');
  emit('tutorial-dialogue-sent', { npcId: 'su_meier' });
  assert.equal(shown.at(-1).progress, '4 / 10');
  emit('ai-dialogue-close');
  assert.equal(shown.at(-1).progress, '5 / 10');
  emit('cultivation-changed', { source: 'cultivate' });
  assert.equal(shown.at(-1).progress, '6 / 10');
  emit('tutorial-inventory-opened');
  assert.equal(shown.at(-1).progress, '7 / 10');
  emit('tutorial-inventory-closed');
  assert.equal(shown.at(-1).progress, '8 / 10');
  emit('tutorial-building-opened', { id: 'welcome-pavilion' });
  assert.equal(shown.at(-1).progress, '9 / 10');
  emit('ai-dialogue-open', { npcId: 'su_meier' });
  assert.equal(shown.at(-1).progress, '10 / 10');
  emit('affinity-changed', { npcId: 'su_meier', source: 'gift' });
  assert.equal(shown.at(-1).progress, '引导完成');
  console.log('tutorial system test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
