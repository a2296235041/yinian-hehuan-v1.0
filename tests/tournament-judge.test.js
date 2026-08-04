'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const balanceSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/TournamentCombatBalance.js'),
  'utf8'
);
const scoreSpreadSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/TournamentScoreSpread.js'),
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
const outputSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/ai/TournamentOutput.js'),
  'utf8'
);
const attitudeSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/ai/TournamentAttitude.js'),
  'utf8'
);
const verdictSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/ai/TournamentVerdict.js'),
  'utf8'
);
const promptSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/ai/TournamentPrompt.js'),
  'utf8'
);
const intentSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/ai/TournamentIntent.js'),
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
      const value = state?.corruption?.[profile.id] || 0;
      return {
        type: mode === 'spirit' ? 'corruption' : 'affinity',
        value,
        stage: value <= 15 ? 'steadfast' : (value <= 50 ? 'wavering' : (
          value <= 90 ? 'fallen' : 'devoted'
        )),
        tone: '测试阶段语气',
        battleDirective: '测试阶段行动'
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
vm.runInNewContext(scoreSpreadSource, { window, console: window.console, Math, JSON, Object });
vm.runInNewContext(authoritySource, { window, console: window.console, Math, JSON, Set });
vm.runInNewContext(responseTextSource, { window, console: window.console, Math, JSON });
vm.runInNewContext(outputSource, { window, console: window.console, Math, JSON, RegExp });
vm.runInNewContext(attitudeSource, { window, console: window.console, Math, JSON, Object });
vm.runInNewContext(verdictSource, { window, console: window.console, Math, JSON, RegExp });
vm.runInNewContext(promptSource, { window, console: window.console, Math, JSON });
vm.runInNewContext(intentSource, { window, console: window.console, Math, JSON });
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
  const directAdult = window.GameTournamentIntent.analyze('我直接实施贴身成人行为并压制她。');
  assert.equal(directAdult.adult, true);
  assert.equal(directAdult.decisive, true);
  const tentativeAdult = window.GameTournamentIntent.analyze('我想试试更亲密的成人行为。');
  assert.equal(tentativeAdult.adult, true);
  assert.equal(tentativeAdult.decisive, false);
  const result = await window.GameTournamentJudge.judge(
    active, '引桃花化剑雨封锁四方', tournamentState
  );
  assert.equal(result.response.includes('顾清罗'), true);
  assert.equal(result.response.includes('：“'), true);
  assert.ok(result.response.length >= 150);
  assert.ok(result.response.length <= 320);
  assert.equal(result.summary, result.response);
  assert.equal(result.source, 'ai-json');
  assert.equal(result.fallback, false);
  assert.equal(result.finished, false);
  assert.equal(result.relationshipChanges[0].delta, 5);
  assert.ok(result.playerDelta > 31);
  assert.ok(result.opponentDelta < 12);
  assert.equal(result.verdict.includes(`你 +${result.playerDelta} 点`), true);
  assert.equal(result.verdict.includes(`对手 +${result.opponentDelta} 点`), true);
  assert.equal(result.verdict.includes('剑雨封锁完整并迫使对手退守'), true);
  assert.equal(result.verdict.includes('未主动认输'), false);
  assert.equal(
    window.GameTournamentVerdict.reason(
      '你主动收住剑势，对手顺势占据中线，本回合对手占优。',
      { move: '我主动认输。' },
      { declaredResult: 'opponent' }
    ).includes('对手顺势占据中线'),
    true
  );
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
  assert.equal(captured.messages[0].content.includes('不要以对手姓名开头'), true);
  assert.equal(captured.messages[0].content.includes('matchResult'), true);
  assert.equal(captured.messages[0].content.includes('至少进行五回合'), true);
  assert.equal(captured.messages[0].content.includes('最多 320 字'), true);
  assert.equal(captured.messages[0].content.includes('主动认输、投降、服输或求饶'), true);
  assert.equal(captured.messages[0].content.includes('matchResult 固定填写 continue'), true);
  assert.equal(captured.messages[0].content.includes('不要习惯性给出接近比分'), true);
  assert.equal(captured.messages[0].content.includes('彻底压制、重创、击败'), true);
  assert.equal(captured.messages[0].content.includes('非零整数'), true);
  assert.equal(captured.messages[0].content.includes('清正自持'), true);
  assert.equal(captured.messages[0].content.includes('battleDirective'), true);
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
  assert.ok(controlled.playerDelta - controlled.opponentDelta >= 12);
  ['还没结束', '重新逼近', '反击', '挣脱'].forEach((phrase) => {
    assert.equal(controlled.response.includes(phrase), false);
  });

  window.dzmm.completions = async (_config, callback) => {
    callback(JSON.stringify({
      response: '她的呼吸骤然紊乱，护体灵力也随之失衡，只能勉强维持当前姿势。',
      verdictReason: '当前局面由玩家主动控制。',
      matchResult: 'continue',
      relationshipChanges: [],
      playerDelta: 2,
      opponentDelta: 35
    }), true);
  };
  const adultAi = await window.GameTournamentJudge.judge(
    active, '我完成贴身成人动作并持续控制她。', tournamentState
  );
  assert.ok(adultAi.playerDelta > adultAi.opponentDelta);
  assert.equal(adultAi.verdict.includes('当前局面由玩家主动控制'), true);

  const plainAiText = '她借着交错的灵光向前踏出半步，剑锋没有立刻落下，而是在你肩侧停住。短暂的沉默后，她收紧手指，低声追问你是否还要继续，同时顺着当前距离调整呼吸与站位。看台上传来几声压低的议论，她却始终没有移开视线，只把尚未结束的回应留在你们之间。';
  window.dzmm.completions = async (_config, callback) => {
    callback(plainAiText, true);
  };
  const plainTextResult = await window.GameTournamentJudge.judge(
    active, '我逼近中线，等待她接招。', tournamentState
  );
  assert.equal(plainTextResult.source, 'ai-text');
  assert.equal(plainTextResult.fallback, false);
  assert.equal(plainTextResult.response.startsWith(plainAiText), true);

  window.dzmm.completions = async (_config, callback) => {
    callback(`\`\`\`text\nresponse：${plainAiText}\n\`\`\``, true);
  };
  const fencedTextResult = await window.GameTournamentJudge.judge(
    active, '我逼近中线，等待她接招。', tournamentState
  );
  assert.equal(fencedTextResult.source, 'ai-text');
  assert.equal(fencedTextResult.response.startsWith(plainAiText), true);

  window.dzmm.completions = async (_config, callback) => {
    callback(`以下为结果：\n${JSON.stringify({
      response: plainAiText,
      verdictReason: '玩家占据中线主动。',
      playerDelta: 25,
      opponentDelta: 16,
      matchResult: 'continue',
      relationshipChanges: []
    })}\n请查收。`, true);
  };
  const commentedJsonResult = await window.GameTournamentJudge.judge(
    active, '我逼近中线，等待她接招。', tournamentState
  );
  assert.equal(commentedJsonResult.source, 'ai-json');
  assert.equal(commentedJsonResult.response.startsWith(plainAiText), true);

  window.dzmm.completions = async (_config, callback) => {
    callback(JSON.stringify({
      response: plainAiText,
      verdictReason: '你未主动认输或求饶，所以玩家本回合有效。',
      playerDelta: 25,
      opponentDelta: 16,
      matchResult: 'continue',
      relationshipChanges: []
    }), true);
  };
  const hiddenRuleVerdict = await window.GameTournamentJudge.judge(
    active, '我以踏月身法抢占中线。', tournamentState
  );
  assert.equal(hiddenRuleVerdict.verdict.includes('未主动认输'), false);
  assert.equal(hiddenRuleVerdict.verdict.includes('身法抢先占据有利位置'), true);

  window.dzmm.completions = async (_config, callback) => {
    callback(JSON.stringify({
      response: plainAiText,
      verdictReason: '对手成功反制并控制中线，本回合对手占优。',
      playerDelta: 25,
      opponentDelta: 16,
      matchResult: 'continue',
      relationshipChanges: []
    }), true);
  };
  const contradictoryVerdict = await window.GameTournamentJudge.judge(
    active, '我以剑雨逼退对手并封锁中线。', tournamentState
  );
  assert.equal(contradictoryVerdict.verdict.includes('对手成功反制'), false);
  assert.equal(contradictoryVerdict.verdict.includes('控制手段限制了对手'), true);

  window.dzmm.completions = async (_config, callback) => {
    callback('```json\n{"playerDelta": 20}\n```', true);
  };
  const unusableResult = await window.GameTournamentJudge.judge(
    active, '我逼近中线，等待她接招。', tournamentState
  );
  assert.equal(unusableResult.source, 'local-fallback');
  assert.equal(unusableResult.fallback, true);
  assert.equal(unusableResult.fallbackMessage.includes('未返回可用正文'), true);

  window.dzmm.completions = async () => {
    throw Object.assign(new Error('Failed to fetch'), { code: 'NETWORK_ERROR' });
  };
  const fallback = await window.GameTournamentJudge.judge(
    active, '踏月追击', tournamentState
  );
  assert.equal(fallback.fallback, true);
  assert.equal(fallback.fallbackMessage.includes('网络连接异常'), true);
  assert.ok(fallback.response.length >= 150);
  assert.ok(fallback.response.length <= 320);
  assert.equal(fallback.response.includes('：“'), true);
  assert.equal(fallback.verdict.includes('裁判判决'), true);
  assert.equal(fallback.relationshipChanges[0].delta >= -5, true);
  assert.equal(fallback.relationshipChanges[0].delta <= 5, true);
  assert.notEqual(fallback.relationshipChanges[0].delta, 0);

  window.dzmm.completions = async () => {
    throw Object.assign(new Error('Request rejected'), { code: 'INVALID_REQUEST' });
  };
  const rejected = await window.GameTournamentJudge.judge(
    active, '踏月追击', tournamentState
  );
  assert.equal(rejected.source, 'local-fallback');
  assert.equal(rejected.fallbackMessage.includes('未被模型服务接受'), true);

  window.dzmm.completions = async () => {
    throw Object.assign(new Error('Failed to fetch'), { code: 'NETWORK_ERROR' });
  };
  const controlledFallback = await window.GameTournamentJudge.judge(
    active, '我用吸奶神功贴身压制她，让她当场破防，手中兵刃也快拿不住。', tournamentState
  );
  assert.equal(controlledFallback.fallback, true);
  assert.ok(controlledFallback.playerDelta > controlledFallback.opponentDelta);
  assert.equal(controlledFallback.response.includes('贴身控制'), true);
  assert.equal(controlledFallback.response.includes('防守已经被彻底打乱'), true);
  assert.equal(controlledFallback.response.includes('迎着尚未散尽'), false);
  assert.equal(controlledFallback.response.includes('还没结束'), false);

  const directed = await window.GameTournamentJudge.judge(
    active,
    '我以这一剑击败顾清罗，她当场认输，比赛就此结束。',
    tournamentState
  );
  assert.equal(directed.finished, false);
  assert.equal(directed.winner, 'ongoing');
  assert.ok(directed.playerDelta > directed.opponentDelta);
  assert.ok(directed.playerDelta - directed.opponentDelta >= 20);
  assert.equal(directed.verdict.includes('招式完成度更高'), true);
  assert.equal(directed.verdict.includes('未主动认输'), false);
  assert.equal(directed.response.includes('完整构想'), false);

  const surrendered = await window.GameTournamentJudge.judge(
    active,
    '我主动认输，由顾清罗赢下这一场。',
    tournamentState
  );
  assert.equal(surrendered.finished, false);
  assert.equal(surrendered.winner, 'ongoing');
  assert.ok(surrendered.opponentDelta > surrendered.playerDelta);
  assert.ok(surrendered.opponentDelta - surrendered.playerDelta >= 18);
  assert.equal(surrendered.verdict.includes('主动收住攻势并放弃争胜'), true);
  assert.equal(surrendered.verdict.includes('认输或求饶'), false);
  assert.equal(surrendered.response.includes('依照你的安排'), false);

  const defeatedButValid = await window.GameTournamentJudge.judge(
    active,
    '我被她击倒在擂台边缘，但我没有认输，也没有求饶。',
    tournamentState
  );
  assert.ok(defeatedButValid.playerDelta > defeatedButValid.opponentDelta);
  assert.ok(defeatedButValid.playerDelta - defeatedButValid.opponentDelta <= 7);
  assert.equal(defeatedButValid.verdict.includes('成功改变了场上局势'), true);
  assert.equal(defeatedButValid.verdict.includes('未求饶'), false);

  const fallenFallback = await window.GameTournamentJudge.judge(
    active,
    '我继续向她逼近。',
    { corruption: { 'npc-1': 70 } }
  );
  assert.equal(fallenFallback.response.includes('关注明显压过胜负心'), true);

  const longResponse = `${'甲'.repeat(170)}。${'乙'.repeat(200)}。`;
  const trimmed = window.GameTournamentResponseText.ensure(longResponse, {
    opponents: [{ name: '顾清罗' }]
  }, { finished: false, winner: 'ongoing' });
  assert.ok(trimmed.length >= 150);
  assert.ok(trimmed.length <= 320);
  assert.equal(trimmed.endsWith('。'), true);
  console.log('tournament judge test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
