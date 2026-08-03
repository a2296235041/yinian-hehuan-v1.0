'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const trafficSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/settings/TrafficSaver.v023.js'),
  'utf8'
);
const narrativeSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/ai/NarrativeService.v025.js'),
  'utf8'
);
let aiCalls = 0;
const window = {
  GamefyRecipes: {
    createVersionedStorage: ({ fallback }) => ({
      load: async () => fallback,
      save: async () => ({ remote: true })
    }),
    createCompletionsSafe: () => ({
      async run() {
        aiCalls += 1;
        return { source: 'ai', text: '不应调用 AI' };
      },
      cancel() {},
      isBusy: () => false
    })
  },
  GameAIModels: {
    whenReady: async () => {},
    getDialogueModel: () => 'default'
  },
  GameAIText: {
    clean: (text, fallback) => String(text || fallback)
  },
  GamePlayerIdentity: {
    get: () => ({ role: '合欢宗弟子', pronoun: '你', intimacyRule: '' })
  },
  GameNPCRelations: {
    getByName: () => null,
    address: () => '道友'
  }
};
const context = { window, console, Set, Object, Array, String, JSON };
vm.runInNewContext(trafficSource, context);
vm.runInNewContext(narrativeSource, context);

(async () => {
  await window.GameTrafficSaver.init();
  await window.GameTrafficSaver.setEnabled(true);
  await window.GameTrafficSaver.setFeature('cultivation', true);
  const dayTexts = window.GameTrafficSaver.getTexts('new_day');
  const periodTexts = window.GameTrafficSaver.getTexts('time_shift');
  assert.equal(dayTexts.length, 5);
  assert.equal(periodTexts.length, 5);
  assert.equal(new Set(dayTexts).size, 5);
  assert.equal(new Set(periodTexts).size, 5);
  assert.equal(window.GameTrafficSaver.featureForNarrative('new_day'), 'cultivation');
  assert.equal(window.GameTrafficSaver.featureForNarrative('time_shift'), 'cultivation');

  const dayText = await window.GameNarrative.generate('new_day', {}, '第 2 天');
  const periodText = await window.GameNarrative.generate('time_shift', {}, '进入午后');
  assert.match(dayText, /晨钟|天光|灵露|阵纹|云海/);
  assert.match(periodText, /光影|时光|钟声|时段|光线/);
  assert.equal(aiCalls, 0);

  await window.GameTrafficSaver.setFeature('cultivation', false);
  const aiText = await window.GameNarrative.generate('new_day', {}, '第 3 天');
  assert.equal(aiText, '不应调用 AI');
  assert.equal(aiCalls, 1);
  console.log('traffic saver time narrative test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
