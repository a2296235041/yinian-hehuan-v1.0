'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/ui/ShopPurchaseController.js'),
  'utf8'
);
let aiCalls = 0;
const window = {
  Game: {},
  GameAudio: { sfx() {} },
  GameShop: {
    async purchase() {
      return {
        changed: true,
        totalPrice: 120,
        item: { name: '聚灵丹' },
        quantity: 6,
        balance: 880
      };
    }
  },
  GameNarrative: {
    async generateDetailed() {
      aiCalls += 1;
      return '不应调用';
    }
  }
};
const statusText = {
  active: true,
  text: '',
  setText(value) {
    this.text = value;
    return this;
  }
};
const button = {
  active: true,
  disableInteractive() { return this; },
  setText() { return this; },
  setInteractive() { return this; }
};
const scene = {
  busy: false,
  requestId: 0,
  buildingId: 'hall',
  statusText,
  refreshBalance() {}
};

vm.runInNewContext(source, { window, console, Object });

(async () => {
  await window.Game.ShopPurchaseController.run(
    scene, { itemId: 'pill', price: 20 }, button, 6
  );
  assert.equal(aiCalls, 0);
  assert.match(statusText.text, /花费 120 灵石/);
  assert.match(statusText.text, /聚灵丹 ×6/);
  assert.match(statusText.text, /剩余灵石 880/);
  console.log('shop purchase no AI test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
