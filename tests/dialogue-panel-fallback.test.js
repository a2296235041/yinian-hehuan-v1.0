'use strict';

const assert = require('node:assert/strict');

global.window = globalThis;

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
  EventBus: { on() {}, emit() {} },
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
input.value = '缺少输入模块仍可发送';
button.dispatchEvent(new Event('click', { cancelable: true }));

setTimeout(() => {
  try {
    assert.deepEqual(sent, ['缺少输入模块仍可发送']);
    console.log('dialogue panel direct binding test passed');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}, 20);
