(function installTimeSystem(root) {
  'use strict';

  // 每个时段同时提供叙事文案与光影参数，场景只读取状态，不自行判断时间。
  const PERIODS = Object.freeze([
    Object.freeze({
      id: 'morning', name: '早', atmosphere: '晨雾初散，山门沐在淡金天光中',
      tint: 0xffe9c6, overlayColor: 0x4a321f, overlayAlpha: 0.04
    }),
    Object.freeze({
      id: 'noon', name: '中', atmosphere: '日色正盛，楼阁与云海清晰明亮',
      tint: 0xffffff, overlayColor: 0x07100d, overlayAlpha: 0
    }),
    Object.freeze({
      id: 'evening', name: '晚', atmosphere: '夕照斜落，灯火沿着山道次第亮起',
      tint: 0xffb07c, overlayColor: 0x51261d, overlayAlpha: 0.15
    }),
    Object.freeze({
      id: 'late-night', name: '深夜', atmosphere: '月色沉静，宗门只余巡夜灯火',
      tint: 0x7690c5, overlayColor: 0x071228, overlayAlpha: 0.34
    })
  ]);

  function normalizeIndex(value) {
    return Math.max(0, Math.min(PERIODS.length - 1, Math.floor(Number(value) || 0)));
  }

  function getSnapshot(player = root.Game?.player) {
    const day = Math.max(1, Math.floor(Number(player?.day) || 1));
    const periodIndex = normalizeIndex(player?.periodIndex);
    const period = PERIODS[periodIndex];
    return {
      ...period,
      day,
      periodIndex,
      label: `第 ${day} 天 · ${period.name}`
    };
  }

  function emitCurrent(source = 'sync', extra = {}) {
    const snapshot = { ...getSnapshot(), source, ...extra };
    root.Game.EventBus.emit('time-period-changed', snapshot);
    return snapshot;
  }

  async function startNewDay() {
    const player = root.Game?.player;
    if (!player) throw new Error('玩家状态尚未初始化');
    const result = await root.GameAffinity.advanceDay();
    player.day = result.day;
    player.periodIndex = 0;
    player.stamina = player.maxStamina;
    player.dailyCultivationCount = player.maxDailyCultivation;
    return result;
  }

  function emitAdvance(previous, newDay, durable) {
    const player = root.Game.player;
    const snapshot = emitCurrent('advance', {
      newDay,
      durable,
      previousPeriod: previous.name
    });
    root.Game.EventBus.emit('player-state-changed', { player: { ...player } });
    if (newDay) {
      root.Game.EventBus.emit('game-day-advanced', { day: player.day, durable });
    }
    return snapshot;
  }

  // 下一时辰正常循环；从深夜进入早晨时才自动跨日。
  async function advance() {
    const player = root.Game?.player;
    if (!player) throw new Error('玩家状态尚未初始化');
    const previous = getSnapshot(player);
    if (previous.periodIndex < PERIODS.length - 1) {
      player.periodIndex = previous.periodIndex + 1;
      return emitAdvance(previous, false, null);
    }
    const result = await startNewDay();
    return emitAdvance(previous, true, result.durable);
  }

  // “下一天”按钮无论当前处于哪个时段，都会直接进入次日早晨。
  async function advanceDay() {
    const player = root.Game?.player;
    if (!player) throw new Error('玩家状态尚未初始化');
    const previous = getSnapshot(player);
    const result = await startNewDay();
    return emitAdvance(previous, true, result.durable);
  }

  root.GameTime = Object.freeze({
    periods: PERIODS,
    normalizeIndex,
    getSnapshot,
    emitCurrent,
    advance,
    advanceDay
  });
}(window));
