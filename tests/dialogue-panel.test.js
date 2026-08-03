'use strict';

const assert = require('node:assert/strict');

global.window = globalThis;
const traces = [];
global.GameTrace = (scope, eventName, details) => {
  traces.push({ scope, eventName, details });
};

class MockElement extends EventTarget {
  constructor() {
    super();
    this.value = '';
    this.textContent = '';
    this.dataset = {};
    this.hidden = false;
    this.disabled = false;
  }

  blur() {}
  removeAttribute() {}
}

const elements = new Map();
[
  'ai-dialogue-panel', 'dialogue-blocker', 'dialogue-history',
  'dialogue-npc-name', 'dialogue-npc-title', 'dialogue-affinity',
  'dialogue-status', 'dialogue-input', 'dialogue-send', 'dialogue-gift',
  'dialogue-draw', 'ai-image-modal', 'ai-image-status', 'ai-image',
  'dialogue-portrait', 'portrait-modal', 'portrait-status', 'portrait-image',
  'dialogue-close', 'ai-image-close', 'portrait-close'
].forEach((id) => elements.set(id, new MockElement()));

global.document = {
  getElementById: (id) => elements.get(id)
};
global.Game = {
  EventBus: { on() {} },
  NpcCardRenderer: { portraitPath: () => '' }
};
global.GameGiftPanel = { open() {} };
const sent = [];
global.GameAI = {
  send: async (text) => sent.push(text),
  generateImage() {}
};

require('../publish/src/ai/DialoguePanel.v014.js');
GameDialoguePanel.init();

const input = elements.get('dialogue-input');
const button = elements.get('dialogue-send');

function fireEnter(target) {
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperty(event, 'key', { value: 'Enter' });
  target.dispatchEvent(event);
}

function wait(ms = 20) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  input.value = '点击发送';
  button.dispatchEvent(new Event('click', { cancelable: true }));
  await wait();
  input.value = '回车发送';
  fireEnter(input);
  await wait();

  try {
    assert.deepEqual(sent, ['点击发送', '回车发送']);
    assert.equal(elements.get('dialogue-status').textContent, '消息已发送，等待回应…');
    assert.ok(traces.some((entry) => entry.eventName === 'init'));
    assert.ok(traces.some((entry) => (
      entry.eventName === 'binder-selected'
      && entry.details.binder === 'direct-click-keydown'
    )));
    assert.ok(traces.some((entry) => entry.eventName === 'direct-submit'));
    assert.ok(traces.some((entry) => entry.eventName === 'send-enter'));
    assert.ok(traces.some((entry) => entry.eventName === 'send-exit'));
    console.log('dialogue panel integration test passed');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
})();
