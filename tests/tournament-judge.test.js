'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const balanceSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/TournamentCombatBalance.js'),
  'utf8'
);
const authoritySource = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/TournamentPlayerAuthority.js'),
  'utf8'
);
const judgeSource = fs.readFileSync(
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
        summary: '你引动桃花化作漫天剑雨，剑锋沿擂台阵纹层层展开，逼得顾清罗借风后撤。她没有贸然硬接，而是旋身斩出月弧，将最先逼近的剑光逐一拨开，随后以寒霜封住脚下三尺，试图截断灵力流转。剑雨与霜华连续碰撞，碎光映亮四周看台，观众席随之响起一阵低呼。待最后一道剑影散去，你仍占据擂台中线，顾清罗则横剑凝神，重新寻找反击时机。',
        verdictReason: '剑雨封锁完整并迫使对手退守，本回合你占优。',
        matchResult: 'continue',
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
vm.runInNewContext(balanceSource, { window, console: window.console, Math, JSON });
vm.runInNewContext(authoritySource, { window, console: window.console, Math, JSON, Set });
vm.runInNewContext(judgeSource, { window, console: window.console, Math, JSON });

const active = {
  mode: 'spirit',
  turn: 0,
  scores: { player: 0, opponent: 0 },
  opponentIds: ['npc-1'],
  roster: [
    { id: 'player', name: '你', title: '弟子', power: 90 },
    {
      id: 'npc-1',
      name: '顾清罗',
      personality: '严谨',
      combat_style: '寒霜剑法',
      power: 75
    }
  ],
  battleSummary: '双方刚刚登台。',
  logs: [{ speaker: '裁判', text: '比试开始。' }]
};

(async () => {
  const tournamentState = { corruption: { 'npc-1': 8 } };
  const result = await window.GameTournamentJudge.judge(
    active, '引桃花化剑雨封锁四方', tournamentState
  );
  assert.equal(result.summary.includes('观众席'), true);
  assert.ok(result.summary.length >= 150);
  assert.ok(result.summary.length <= 200);
  assert.equal(result.finished, false);
  assert.equal(result.relationshipChanges[0].delta, 3);
  assert.ok(result.playerDelta > 31);
  assert.ok(result.opponentDelta < 12);
  assert.equal(result.verdict.includes(`你 +${result.playerDelta} 点`), true);
  assert.equal(result.verdict.includes(`对手 +${result.opponentDelta} 点`), true);
  assert.deepEqual(Array.from(captured.messages, (entry) => entry.role), ['user']);
  assert.equal(captured.messages[0].content.includes('双方刚刚登台'), true);
  assert.equal(captured.messages[0].content.includes('引桃花化剑雨'), true);
  assert.equal(captured.messages[0].content.includes('150-200'), true);
  assert.equal(captured.messages[0].content.includes('字段仅为：summary'), true);
  assert.equal(captured.messages[0].content.includes('最高叙事指令'), true);
  assert.equal(captured.messages[0].content.includes('matchResult'), true);
  assert.equal(captured.messages[0].content.includes('不要复述、引用'), true);
  assert.equal(captured.messages[0].content.includes('最后一个动作或结果之后'), true);
  assert.equal(captured.messages[0].content.includes('禁止出现“按照你的描述”'), true);

  const conciseSummary = '剑雨消散的刹那，顾清罗立即压低剑锋贴近中线，借残留寒气封住退路。你顺势转腕逼开霜刃，她踉跄半步后重新稳住呼吸，双方距离再次缩短。';
  window.dzmm.completions = async (_config, callback) => {
    callback(JSON.stringify({
      summary: conciseSummary,
      verdictReason: '连续压迫迫使对手后退，本回合你占优。',
      matchResult: 'continue',
      relationshipChanges: [],
      playerDelta: 24,
      opponentDelta: 14
    }), true);
  };
  const concise = await window.GameTournamentJudge.judge(
    active, '踏月追击', tournamentState
  );
  assert.equal(concise.summary, conciseSummary);

  window.dzmm.completions = async () => {
    throw Object.assign(new Error('Failed to fetch'), { code: 'NETWORK_ERROR' });
  };
  const fallback = await window.GameTournamentJudge.judge(
    active, '踏月追击', tournamentState
  );
  assert.equal(fallback.fallback, true);
  assert.equal(fallback.fallbackMessage.includes('网络连接异常'), true);
  assert.ok(fallback.summary.length >= 60);
  assert.ok(fallback.summary.length <= 200);
  assert.equal(fallback.verdict.includes('裁判判决'), true);
  assert.equal(fallback.relationshipChanges[0].delta >= -4, true);
  assert.equal(fallback.relationshipChanges[0].delta <= 3, true);

  const directed = await window.GameTournamentJudge.judge(
    active,
    '我以这一剑击败顾清罗，她当场认输，比赛就此结束。',
    tournamentState
  );
  assert.equal(directed.finished, true);
  assert.equal(directed.winner, 'player');
  assert.ok(directed.playerDelta > directed.opponentDelta);
  assert.equal(directed.summary.includes('完整构想'), false);

  const surrendered = await window.GameTournamentJudge.judge(
    active,
    '我主动认输，由顾清罗赢下这一场。',
    tournamentState
  );
  assert.equal(surrendered.finished, true);
  assert.equal(surrendered.winner, 'opponent');
  assert.ok(surrendered.opponentDelta > surrendered.playerDelta);
  assert.equal(surrendered.summary.includes('依照你的安排'), false);
  console.log('tournament judge test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
