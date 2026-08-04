'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/ai/NarrativeService.v025.js'),
  'utf8'
);
const prompts = [];
const window = {
  GamefyRecipes: {
    createCompletionsSafe: () => ({
      async run(config) {
        prompts.push(config.messages[0].content);
        config.onDone('你完成了这次行动。');
        return { text: '你完成了这次行动。' };
      },
      cancel() {},
      isBusy: () => false
    })
  },
  GameAIModels: {
    whenReady: async () => {},
    getDialogueModel: () => 'default'
  },
  GameAIText: { clean: (text, fallback) => String(text || fallback) },
  GamePlayerIdentity: {
    get: () => ({ role: '成年男性弟子', pronoun: '他', intimacyRule: '' })
  },
  GameNPCRelations: { getByName: () => null, address: () => '道友' },
  GameTrafficSaver: {
    whenReady: async () => {},
    featureForNarrative: () => 'cultivation',
    isEnabled: () => false
  }
};

vm.runInNewContext(source, { window, console, JSON, Array, String });

(async () => {
  for (const kind of ['cultivation', 'new_day', 'time_shift']) {
    const text = await window.GameNarrative.generate(kind, {}, '你继续前行。');
    assert.equal(text, '你完成了这次行动。');
  }
  prompts.forEach((prompt) => {
    assert.match(prompt, /始终使用第二人称“你”或“你的”/);
    assert.match(prompt, /严禁用“他、她、它、该弟子、玩家”代称玩家/);
    assert.doesNotMatch(prompt, /叙事中使用“他”指代玩家/);
  });
  console.log('player narrative perspective test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
