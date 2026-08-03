(function installTournamentSystem(root) {
  'use strict';

  const MODE_INFO = Object.freeze({
    internal: Object.freeze({ title: '宗门大比', reward: 120 }),
    spirit: Object.freeze({ title: '灵界武道大会', reward: 300 })
  });
  const fallback = { active: null, cooldowns: { internal: 0, spirit: 0 }, history: [] };
  let state = fallback;
  let storage = null;
  let readyPromise = null;
  let mutationQueue = Promise.resolve();
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function sanitize(value) {
    const cooldowns = value?.cooldowns || {};
    return {
      active: value?.active && typeof value.active === 'object' ? value.active : null,
      cooldowns: {
        internal: Math.max(0, Math.floor(Number(cooldowns.internal) || 0)),
        spirit: Math.max(0, Math.floor(Number(cooldowns.spirit) || 0))
      },
      history: Array.isArray(value?.history) ? value.history.slice(-12) : []
    };
  }
  function queue(action) {
    const task = mutationQueue.then(action, action);
    mutationQueue = task.then(() => undefined, () => undefined);
    return task;
  }
  async function persist(flush = true) {
    const result = await storage.save(state, { flush });
    if (result.remote !== true) throw new Error('赛事进度未能同步到平台');
    state = result.value;
    root.Game?.EventBus?.emit('tournament-changed', clone(state));
    return clone(state);
  }
  function currentDay() {
    return Math.max(1, Math.floor(Number(root.Game?.player?.day) || 1));
  }

  function currentMatch(active = state.active) {
    return active?.round?.matches?.find((match) => match.id === active.round.playerMatchId) || null;
  }

  function prepareBattle(active) {
    const match = currentMatch(active);
    active.phase = 'battle';
    active.turn = 0;
    active.scores = { player: 0, opponent: 0 };
    active.logs = [{
      speaker: '裁判',
      text: active.stageIndex === 2
        ? '问鼎战开始。你需在三人混战中压服另外两位天骄。'
        : '双方登台，护山阵法已开启。请施展你的第一招。'
    }];
    active.opponentIds = (match?.participants || []).filter((id) => id !== 'player');
  }

  function initialize() {
    if (readyPromise) return readyPromise;
    storage = root.GamefyRecipes.createVersionedStorage({
      namespace: 'hehuan:',
      key: 'tournament-progress',
      version: 1,
      fallback,
      migrations: { 0: (value) => value || fallback },
      sanitize,
      maxBytes: 256 * 1024
    });
    readyPromise = storage.load().then((saved) => {
      state = saved;
      return clone(state);
    }).catch((error) => {
      console.error('赛事进度读取失败:', error.code || '', error.message, error.stack);
      throw error;
    });
    return readyPromise;
  }

  function start(mode) {
    return queue(async () => {
      await initialize();
      if (!MODE_INFO[mode]) throw new Error('未知赛事类型');
      if (state.active && state.active.phase !== 'event_complete') {
        throw new Error(`已有进行中的${MODE_INFO[state.active.mode].title}`);
      }
      if (currentDay() < state.cooldowns[mode]) {
        throw new Error(`赛事尚未开启，第 ${state.cooldowns[mode]} 天可再次参加`);
      }
      const roster = root.GameTournamentRoster.build(mode);
      const round = root.GameTournamentRules.createRound(
        roster.map((entry) => entry.id), 0, roster
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
        rewardClaimed: false
      };
      prepareBattle(state.active);
      return persist();
    });
  }

  root.GameTournament = {
    MODE_INFO,
    initialize,
    getState: () => clone(state),
    start,
    recordExchange(move, result) {
      return queue(async () => {
        const active = state.active;
        if (!active || active.phase !== 'battle') throw new Error('当前没有可进行的赛事对局');
        active.turn += 1;
        active.scores.player += Math.max(0, Math.floor(Number(result.playerDelta) || 0));
        active.scores.opponent += Math.max(0, Math.floor(Number(result.opponentDelta) || 0));
        active.logs.push({ speaker: '你', text: String(move).slice(0, 500) });
        active.logs.push({ speaker: '战局', text: String(result.narration || '').slice(0, 900) });
        active.logs.push({ speaker: '解说', text: String(result.commentary || '').slice(0, 360) });
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
    advanceRound() {
      return queue(async () => {
        const active = state.active;
        if (!active || active.phase !== 'round_complete') throw new Error('当前轮次尚未结束');
        active.roundHistory.push(clone(active.round));
        active.stageIndex += 1;
        active.round = root.GameTournamentRules.createRound(
          active.pendingEntrants, active.stageIndex, active.roster
        );
        delete active.pendingEntrants;
        prepareBattle(active);
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
        state = clone(fallback);
        root.Game?.EventBus?.emit('tournament-changed', clone(state));
        return true;
      });
    }
  };
}(window));
