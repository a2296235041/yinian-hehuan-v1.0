(function installTournamentRelations(root) {
  'use strict';

  const CORRUPTION_STAGES = Object.freeze([
    Object.freeze({
      id: 'steadfast',
      min: 0,
      max: 15,
      label: '清正自持',
      tone: '克制、疏离、警惕，措辞正式，尽力维持礼法与冷静。',
      battleDirective: '保持距离并认真应战，受到影响时会压住情绪，不主动亲近玩家。'
    }),
    Object.freeze({
      id: 'wavering',
      min: 16,
      max: 50,
      label: '道心动摇',
      tone: '语气出现迟疑、羞恼与额外关注，强硬表面下会暴露动摇。',
      battleDirective: '仍会防守和交锋，但更容易被玩家的话语与动作牵动注意。'
    }),
    Object.freeze({
      id: 'fallen',
      min: 51,
      max: 90,
      label: '沉沦渐深',
      tone: '对玩家明显依恋、偏执而坦率，情绪和身体反应更难掩饰。',
      battleDirective: '会主动贴近并顺着玩家主导的节奏回应，胜负心开始让位于关注玩家。'
    }),
    Object.freeze({
      id: 'devoted',
      min: 91,
      max: 100,
      label: '彻底堕落',
      tone: '态度热切、顺从且毫不掩饰，对玩家的称呼和回应更亲密直接。',
      battleDirective: '主动迎合玩家的行动与局面安排，将取悦和追随玩家置于比赛胜负之前。'
    })
  ]);

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.trunc(Number(value) || 0)));
  }

  function sanitize(value) {
    const clean = {};
    Object.entries(value || {}).slice(0, 50).forEach(([id, amount]) => {
      if (/^[a-z0-9_-]{1,64}$/i.test(id)) clean[id] = clamp(amount, 0, 100);
    });
    return clean;
  }

  function corruptionStage(value) {
    const amount = clamp(value, 0, 100);
    return CORRUPTION_STAGES.find((stage) => amount <= stage.max)
      || CORRUPTION_STAGES.at(-1);
  }

  function display(profile, mode, state) {
    if (!profile || profile.id === 'player') return null;
    if (mode === 'internal') {
      const snapshot = root.GameAffinity?.getSnapshot?.(profile.id);
      return {
        type: 'affinity',
        label: '好感度',
        value: snapshot?.affinity || 0,
        rank: snapshot?.relationship || '初识'
      };
    }
    const value = clamp(state?.corruption?.[profile.id], 0, 100);
    const stage = corruptionStage(value);
    return {
      type: 'corruption',
      label: '堕落值',
      value,
      rank: stage.label,
      stage: stage.id,
      tone: stage.tone,
      battleDirective: stage.battleDirective,
      full: value === 100
    };
  }

  function normalizedChanges(active, result) {
    const changes = Array.isArray(result?.relationshipChanges)
      ? result.relationshipChanges
      : [];
    return active.opponentIds.map((id, index) => {
      const raw = changes.find((entry) => entry?.opponentId === id) || changes[index] || {};
      const rawDelta = Math.trunc(Number(raw.delta) || 0);
      const delta = active.mode === 'spirit'
        ? (rawDelta < 0 ? -1 : 1) * clamp(Math.abs(rawDelta), 1, 5)
        : clamp(rawDelta, -3, 4);
      return {
        opponentId: id,
        delta,
        reason: String(raw.reason || '这次交锋改变了她对你的看法。').slice(0, 160)
      };
    });
  }

  async function apply(state, active, result) {
    const logs = [];
    const changes = normalizedChanges(active, result);
    for (const change of changes) {
      const profile = active.roster.find((entry) => entry.id === change.opponentId);
      if (!profile) continue;
      if (active.mode === 'internal') {
        const applied = await root.GameAffinity.adjust(
          profile.id, change.delta, 'tournament'
        );
        const delta = applied.delta || 0;
        logs.push({
          speaker: '关系变化',
          text: `${profile.name}好感度 ${delta >= 0 ? '+' : ''}${delta}：${change.reason}`
        });
      } else {
        const before = clamp(state.corruption[profile.id], 0, 100);
        let requested = change.delta;
        if (before === 0 && requested < 0) requested = Math.abs(requested);
        if (before === 100 && requested > 0) requested = -requested;
        const after = clamp(before + requested, 0, 100);
        state.corruption[profile.id] = after;
        const applied = after - before;
        logs.push({
          speaker: '关系变化',
          text: `${profile.name}堕落值 ${applied >= 0 ? '+' : ''}${applied}：${change.reason}`
        });
      }
    }
    return logs;
  }

  root.GameTournamentRelations = Object.freeze({
    CORRUPTION_STAGES,
    sanitize,
    corruptionStage,
    display,
    normalizedChanges,
    apply
  });
}(window));
