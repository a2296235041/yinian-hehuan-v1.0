'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/ai/TournamentJudge.js'),
  'utf8'
);
let captured = null;
const window = {
  navigator: { onLine: true },
  GameTournamentRoster: {
    getProfile(id, roster) {
      return roster.find((entry) => entry.id === id) || null;
    }
  },
  GameTournamentRelations: {
    display(profile, mode, state) {
      return {
        type: mode === 'spirit' ? 'corruption' : 'affinity',
        value: state?.corruption?.[profile.id] || 0
      };
    }
  },
  dzmm: {
    async completions(config, callback) {
      captured = config;
      callback(JSON.stringify({
        opponentAction: '对手借风后撤，反手斩出月弧。',
        narration: '两股灵力在擂台中央连续碰撞。',
        globalCommentary: '此前的试探在本回合转化为正面压制，玩家开始控制全场。',
        battleSummary: '第一回合后，玩家掌握擂台中线。',
        tacticalHint: '可利用对手后撤时留下的空隙。',
        relationshipChanges: [{
          opponentId: 'npc-1',
          delta: 9,
          reason: '玩家的魅惑剑意让她心境动摇。'
        }],
        playerDelta: 31,
        opponentDelta: 12
      }), true);
    }
  },
  console: { error() {} },
  Math
};
vm.runInNewContext(source, { window, console: window.console, Math, JSON });

const active = {
  mode: 'spirit',
  turn: 0,
  scores: { player: 0, opponent: 0 },
  opponentIds: ['npc-1'],
  roster: [
    { id: 'player', name: '你', title: '弟子' },
    { id: 'npc-1', name: '顾清罗', personality: '严谨', combat_style: '寒霜剑法' }
  ],
  battleSummary: '双方刚刚登台。',
  logs: [{ speaker: '裁判', text: '比试开始。' }]
};

(async () => {
  const tournamentState = { corruption: { 'npc-1': 8 } };
  const result = await window.GameTournamentJudge.judge(
    active, '引桃花化剑雨封锁四方', tournamentState
  );
  assert.equal(result.globalCommentary.includes('控制全场'), true);
  assert.equal(result.battleSummary, '第一回合后，玩家掌握擂台中线。');
  assert.equal(result.finished, false);
  assert.equal(result.relationshipChanges[0].delta, 3);
  assert.deepEqual(Array.from(captured.messages, (entry) => entry.role), ['user']);
  assert.equal(captured.messages[0].content.includes('双方刚刚登台'), true);
  assert.equal(captured.messages[0].content.includes('引桃花化剑雨'), true);

  window.dzmm.completions = async () => {
    throw Object.assign(new Error('Failed to fetch'), { code: 'NETWORK_ERROR' });
  };
  const fallback = await window.GameTournamentJudge.judge(
    active, '踏月追击', tournamentState
  );
  assert.equal(fallback.fallback, true);
  assert.equal(fallback.fallbackMessage.includes('网络连接异常'), true);
  assert.equal(fallback.globalCommentary.length > 30, true);
  assert.equal(fallback.relationshipChanges[0].delta >= -4, true);
  assert.equal(fallback.relationshipChanges[0].delta <= 3, true);
  console.log('tournament judge test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
