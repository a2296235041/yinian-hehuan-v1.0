(function installTournamentScoreSpread(root) {
  'use strict';

  const caps = Object.freeze({ player: 45, opponent: 38 });
  const patterns = Object.freeze({
    overwhelming: /(秒杀|碾压|彻底击败|完全击败|当场击败|击溃|重创|无法再战|倒地不起|失去战斗能力|终结|摧毁|当场认输|跪地求饶)/,
    clear: /(命中|击中|击退|击飞|封锁|困住|束缚|定住|破招|化解|反制|逼退|破防|压制|制住|动弹不得|无法反抗|失去力气|脱手|封住经脉|控制|占据中线)/,
    tactical: /(防守|格挡|闪避|身法|步法|抢占|牵制|试探|迂回|蓄势|追击)/
  });

  function clamp(value, max) {
    return Math.max(0, Math.min(max, Math.round(Number(value) || 0)));
  }

  function hash(value) {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function describesPlayerDisadvantage(move) {
    const value = String(move || '');
    return /(?:我|玩家|你)[^，。！？]{0,6}(?:被|遭|任由)[^，。！？]{0,18}(?:击中|击倒|击败|击退|击飞|压制|制住|控制|破防|重创|困住|束缚)/
      .test(value)
      || /(?:她|他|对手|敌手)[^，。！？]{0,18}(?:击中|击倒|击败|击退|击飞|压制|制住|控制|破防|重创|困住|束缚)[^，。！？]{0,6}(?:我|玩家|你)/
        .test(value);
  }

  function classify(move, declaredResult) {
    const value = String(move || '').trim();
    if (declaredResult === 'opponent') return 'surrender';
    if (describesPlayerDisadvantage(value)) return 'adverse';
    if (patterns.overwhelming.test(value)) return 'overwhelming';
    if (patterns.clear.test(value)) return 'clear';
    if (patterns.tactical.test(value)) return 'tactical';
    return 'ordinary';
  }

  function requiredGap(move, tier) {
    const ranges = {
      ordinary: [5, 7],
      adverse: [5, 7],
      tactical: [8, 11],
      clear: [12, 18],
      overwhelming: [20, 30],
      surrender: [18, 28]
    };
    const [minimum, maximum] = ranges[tier] || ranges.ordinary;
    return minimum + (hash(`${tier}:${move}`) % (maximum - minimum + 1));
  }

  function enforce(payload, exchange, declaredResult) {
    const move = String(payload?.move || '');
    const tier = classify(move, declaredResult);
    const gap = requiredGap(move, tier);
    const winnerKey = declaredResult === 'opponent' ? 'opponent' : 'player';
    const loserKey = winnerKey === 'player' ? 'opponent' : 'player';
    const values = {
      player: clamp(exchange?.playerDelta, caps.player),
      opponent: clamp(exchange?.opponentDelta, caps.opponent)
    };
    if (tier === 'adverse' && values[winnerKey] - values[loserKey] > gap) {
      values[loserKey] = Math.min(caps[loserKey], values[winnerKey] - gap);
      if (values[winnerKey] - values[loserKey] > gap) {
        values[winnerKey] = values[loserKey] + gap;
      }
    }
    if (values[winnerKey] - values[loserKey] < gap) {
      values[winnerKey] = Math.min(
        caps[winnerKey],
        Math.max(values[winnerKey], values[loserKey] + gap)
      );
      if (values[winnerKey] - values[loserKey] < gap) {
        values[loserKey] = Math.max(0, values[winnerKey] - gap);
      }
    }
    return {
      playerDelta: values.player,
      opponentDelta: values.opponent,
      tier,
      requiredGap: gap
    };
  }

  root.GameTournamentScoreSpread = Object.freeze({
    classify, requiredGap, enforce
  });
}(window));
