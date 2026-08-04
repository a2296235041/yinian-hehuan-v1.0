(function installTournamentSystem(root) {
  'use strict';
  const MODE_INFO = Object.freeze({
    internal: Object.freeze({ title: '宗门大比', reward: 120 }),
    spirit: Object.freeze({ title: '灵界武道大会', reward: 300 })
  });
  const State = root.GameTournamentState;
  let state = State.fresh();
  let storage = null;
  let readyPromise = null;
  let mutationQueue = Promise.resolve();
  function queue(action) {
    const task = mutationQueue.then(action, action);
    mutationQueue = task.then(() => undefined, () => undefined);
    return task;
  }
  async function persist(flush = true) {
    const result = await storage.save(state, { flush });
    if (result.remote !== true) throw new Error('赛事进度未能同步到平台');
    state = result.value;
    root.Game?.EventBus?.emit('tournament-changed', State.clone(state));
    return State.clone(state);
  }
  function currentDay() {
    return Math.max(1, Math.floor(Number(root.Game?.player?.day) || 1));
  }
  function currentMatch(active = state.active) {
    return active?.round?.matches?.find((match) => match.id === active.round.playerMatchId) || null;
  }
  function recordTampering(active, opponentId) {
    if (!opponentId) return;
    const profile = active.roster.find((entry) => entry.id === opponentId);
    active.tamperedOpponentIds = [...(active.tamperedOpponentIds || []), opponentId];
    active.logs.push({
      speaker: '签表异动',
      text: `你暗中篡改了${active.round.label}签文，将${profile?.name || '指定人物'}锁定为对手。`
    });
  }
  function initialize() {
    if (readyPromise) return readyPromise;
    storage = root.GamefyRecipes.createVersionedStorage({
      namespace: 'hehuan:',
      key: 'tournament-progress',
      version: 2,
      fallback: State.fresh(),
      migrations: {
        0: (value) => value || State.fresh(),
        1: (value) => ({ ...(value || State.fresh()), corruption: value?.corruption || {} })
      },
      sanitize: State.sanitize,
      maxBytes: 256 * 1024
    });
    readyPromise = storage.load().then((saved) => {
      state = saved;
      return State.clone(state);
    }).catch((error) => {
      console.error('赛事进度读取失败:', error.code || '', error.message, error.stack);
      throw error;
    });
    return readyPromise;
  }
  function start(mode, preferredOpponentId = '') {
    return queue(async () => {
      await initialize();
      if (!MODE_INFO[mode]) throw new Error('未知赛事类型');
      if (state.active && state.active.phase !== 'event_complete') {
        throw new Error(`已有进行中的${MODE_INFO[state.active.mode].title}`);
      }
      if (currentDay() < state.cooldowns[mode]) {
        throw new Error(`赛事尚未开启，第 ${state.cooldowns[mode]} 天可再次参加`);
      }
      const roster = root.GameTournamentRoster.build(mode, Math.random, preferredOpponentId);
      const round = root.GameTournamentRules.createRound(
        roster.map((entry) => entry.id), 0, roster, Math.random, preferredOpponentId
      );
      state.active = {
        id: `${mode}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mode,
        title: MODE_INFO[mode].title,
        reward: MODE_INFO[mode].reward,
        startedDay: currentDay(),
        stageIndex: 0,
        roster,
        roundHistory: [],
        round,
        phase: 'battle',
        championId: null,
        playerWon: false,
        rewardClaimed: false,
        tamperedOpponentIds: []
      };
      root.GameTournamentBattleState.prepare(state.active, currentMatch(state.active));
      recordTampering(state.active, preferredOpponentId);
      return persist();
    });
  }
  root.GameTournament = {
    MODE_INFO,
    initialize,
    getState: () => State.clone(state),
    exportState: () => State.clone(state),
    restore(nextState) {
      return queue(async () => {
        await initialize();
        state = State.sanitize(nextState);
        return persist(true);
      });
    },
    start,
    recordExchange(move, result) {
      return queue(async () => {
        const active = state.active;
        if (!active || active.phase !== 'battle') throw new Error('当前没有可进行的赛事对局');
        root.GameTournamentBattleState.applyExchange(active, move, result);
        const relationLogs = await root.GameTournamentRelations.apply(state, active, result);
        active.logs.push(...relationLogs);
        if (result.finished) {
          const match = currentMatch(active);
          const winnerId = result.winner === 'player'
            ? 'player'
            : root.GameTournamentRules.weightedWinner(active.opponentIds, active.roster);
          const winners = root.GameTournamentRules.resolvePlayerMatch(active.round, winnerId);
          if (winnerId !== 'player') {
            active.championId = root.GameTournamentRules.simulateChampion(
              winners, active.stageIndex + 1, active.roster
            );
            active.playerWon = false;
            active.phase = 'event_complete';
            state.cooldowns[active.mode] = currentDay() + 10;
          } else if (active.stageIndex === 2) {
            active.championId = 'player';
            active.playerWon = true;
            active.phase = 'event_complete';
            state.cooldowns[active.mode] = currentDay() + 10;
          } else {
            active.pendingEntrants = winners;
            active.phase = 'round_complete';
          }
        }
        return persist();
      });
    },
    advanceRound(preferredOpponentId = '') {
      return queue(async () => {
        const active = state.active;
        if (!active || active.phase !== 'round_complete') throw new Error('当前轮次尚未结束');
        active.roundHistory.push(State.clone(active.round));
        active.stageIndex += 1;
        active.round = root.GameTournamentRules.createRound(
          active.pendingEntrants, active.stageIndex, active.roster,
          Math.random, preferredOpponentId
        );
        delete active.pendingEntrants;
        root.GameTournamentBattleState.prepare(active, currentMatch(active));
        recordTampering(active, active.stageIndex < 2 ? preferredOpponentId : '');
        return persist();
      });
    },
    claimReward() {
      return queue(async () => {
        const active = state.active;
        if (!active?.playerWon || active.rewardClaimed) throw new Error('当前没有可领取的冠军奖励');
        const reward = await root.GameInventory.addSpiritStones(active.reward, 'tournament');
        if (!reward.changed) throw new Error('冠军奖励发放失败');
        active.rewardClaimed = true;
        state.history.push({
          mode: active.mode, day: currentDay(), championId: active.championId, reward: active.reward
        });
        return persist();
      });
    },
    abandonCompleted() {
      return queue(async () => {
        if (state.active?.phase === 'event_complete') state.active = null;
        return persist();
      });
    },
    clear() {
      return queue(async () => {
        await initialize();
        await storage.clear();
        state = State.fresh();
        root.Game?.EventBus?.emit('tournament-changed', State.clone(state));
        return true;
      });
    }
  };
}(window));
