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
    this.placeholder = '';
    this.hidden = false;
    this.disabled = false;
    this.scrollHeight = 0;
    this.scrollTop = 0;
    this.clientHeight = 0;
  }

  replaceChildren() {}
  append() {}
}

const elements = new Map();
[
  'exploration-dialogue-panel', 'exploration-history', 'exploration-panel-title',
  'exploration-panel-status', 'exploration-input', 'exploration-submit',
  'exploration-quick', 'exploration-back'
].forEach((id) => elements.set(id, new MockElement()));

global.document = {
  getElementById: (id) => elements.get(id),
  createElement: () => new MockElement()
};

require('../publish/src/ui/ExplorationPanel.v014.js');

const submitted = [];
let quickCount = 0;
GameExplorationPanel.open(
  { name: '测试山谷' },
  { messages: [] },
  {
    onSubmit: async (text) => submitted.push(text),
    onQuick: () => { quickCount += 1; }
  }
);

function fireEnter(target) {
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperty(event, 'key', { value: 'Enter' });
  target.dispatchEvent(event);
}

function wait(ms = 20) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const input = elements.get('exploration-input');
  input.value = '沿溪流寻找灵草';
  elements.get('exploration-submit').dispatchEvent(new Event('click', { cancelable: true }));
  await wait();
  input.value = '查看山洞';
  fireEnter(input);
  await wait();
  elements.get('exploration-quick').dispatchEvent(new Event('click'));

  assert.deepEqual(submitted, ['沿溪流寻找灵草', '查看山洞']);
  assert.equal(quickCount, 1);
  assert.ok(traces.some((entry) => entry.eventName === 'intent-submit'));
  assert.ok(traces.some((entry) => (
    entry.eventName === 'binder-selected'
    && entry.details.binder === 'direct-click-keydown'
  )));
  console.log('exploration panel direct submission tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
