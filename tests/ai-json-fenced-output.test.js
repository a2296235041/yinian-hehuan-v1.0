'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/ai/AIJson.js'),
  'utf8'
);
const window = {
  GamefyRecipes: {
    createCompletionsSafe: () => ({
      async run() {
        return {
          source: 'ai',
          text: '回应如下：\n```json\n{"responses":[{"speakerId":"npc_a"}]}\n```'
        };
      },
      cancel() {}
    })
  }
};
vm.runInNewContext(source, { window, console, Set, Object, Number, JSON });

(async () => {
  const generator = window.GamefyRecipes.createAiJson({
    validate: (value) => Array.isArray(value?.responses),
    fallback: { responses: [] }
  });
  const result = await generator.generate({
    instructions: '返回测试结构',
    userText: '测试'
  });
  assert.equal(result.source, 'ai');
  assert.equal(result.value.responses[0].speakerId, 'npc_a');
  console.log('AI JSON fenced output test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
