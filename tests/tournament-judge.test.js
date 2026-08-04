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
const responseTextSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/ai/TournamentResponseText.js'),
  'utf8'
);
const promptSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/ai/TournamentPrompt.js'),
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
        response: '顾清罗旋身斩开逼近的剑光，寒霜沿着她的剑锋迅速覆上擂台。她在退到阵纹边缘前猛然止步，抬眼盯住你：“剑势确实凌厉，但想让我就这样退出中线，还差最后一步。”话音落下，她借残留霜气贴地前掠，剑尖连续点向你灵力运转的节点，逼你正面回应。两人的气机再度撞在一起，她的呼吸虽已变急，手腕却仍稳稳压着剑锋。看台近处传来几声低呼，她没有分神，只在与你错身时再次压低声音：“继续，我会看清你下一招。”',
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
vm.runInNewContext(responseTextSource, { window, console: window.console, Math, JSON });
vm.runInNewContext(promptSource, { window, console: window.console, Math, JSON });
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
  assert.equal(result.response.includes('顾清罗'), true);
  assert.equal(result.response.includes('：“'), true);
  assert.ok(result.response.length >= 150);
  assert.ok(result.response.length <= 240);
  assert.equal(result.summary, result.response);
  assert.equal(result.finished, false);
  assert.equal(result.relationshipChanges[0].delta, 3);
  assert.ok(result.playerDelta > 31);
  assert.ok(result.opponentDelta < 12);
  assert.equal(result.verdict.includes(`你 +${result.playerDelta} 点`), true);
  assert.equal(result.verdict.includes(`对手 +${result.opponentDelta} 点`), true);
  assert.deepEqual(Array.from(captured.messages, (entry) => entry.role), ['user', 'user']);
  assert.equal(captured.messages[0].content.includes('双方刚刚登台'), true);
  assert.equal(captured.messages[0].content.includes('引桃花化剑雨'), false);
  assert.equal(captured.messages[1].content.includes('引桃花化剑雨'), true);
  assert.equal(captured.messages[1].content.includes('<player_canon>'), true);
  assert.equal(captured.messages[1].content.includes('不可改写'), true);
  assert.equal(captured.messages[0].content.includes('不少于 150'), true);
  assert.equal(captured.messages[0].content.includes('字段仅为：response'), true);
  assert.equal(captured.messages[0].content.includes('不要写战报、综述'), true);
  assert.equal(captured.messages[0].content.includes('观众反应只能偶尔出现'), true);
  assert.equal(captured.messages[0].content.includes('玩家绝对叙事权'), true);
  assert.equal(captured.messages[0].content.includes('合理续写的定义'), true);
  assert.equal(captured.messages[0].content.includes('禁止新增与之冲突的拒绝'), true);
  assert.equal(captured.messages[0].content.includes('不得替玩家角色新增'), true);
  assert.equal(captured.messages[0].content.includes('matchResult'), true);
  assert.equal(captured.messages[0].content.includes('不要复述、引用'), true);
  assert.equal(captured.messages[1].content.includes('最后一个瞬间之后'), true);
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
  assert.equal(concise.response.startsWith(conciseSummary), true);
  assert.ok(concise.response.length >= 150);
  assert.equal(concise.summary, concise.response);

  window.dzmm.completions = async (_config, callback) => {
    callback(JSON.stringify({
      response: '顾清罗失去力气伏在擂台上，只能抬眼看向你，紊乱的呼吸让她一时说不出完整的话。',
      verdictReason: '玩家已完全控制当前局面，本回合你占优。',
      matchResult: 'continue',
      relationshipChanges: [],
      playerDelta: 32,
      opponentDelta: 4
    }), true);
  };
  const controlled = await window.GameTournamentJudge.judge(
    active, '我封住她的经脉，让她失去力气伏在地上，只能看着我。', tournamentState
  );
  assert.ok(controlled.response.length >= 150);
  ['还没结束', '重新逼近', '反击', '挣脱'].forEach((phrase) => {
    assert.equal(controlled.response.includes(phrase), false);
  });

  window.dzmm.completions = async () => {
    throw Object.assign(new Error('Failed to fetch'), { code: 'NETWORK_ERROR' });
  };
  const fallback = await window.GameTournamentJudge.judge(
    active, '踏月追击', tournamentState
  );
  assert.equal(fallback.fallback, true);
  assert.equal(fallback.fallbackMessage.includes('网络连接异常'), true);
  assert.ok(fallback.response.length >= 150);
  assert.ok(fallback.response.length <= 240);
  assert.equal(fallback.response.includes('：“'), true);
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
  assert.equal(directed.response.includes('完整构想'), false);

  const surrendered = await window.GameTournamentJudge.judge(
    active,
    '我主动认输，由顾清罗赢下这一场。',
    tournamentState
  );
  assert.equal(surrendered.finished, true);
  assert.equal(surrendered.winner, 'opponent');
  assert.ok(surrendered.opponentDelta > surrendered.playerDelta);
  assert.equal(surrendered.response.includes('依照你的安排'), false);
  console.log('tournament judge test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
