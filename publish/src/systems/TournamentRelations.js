(function installTournamentRelations(root) {
  'use strict';

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

  function corruptionRank(value) {
    if (value < 20) return '清明';
    if (value < 40) return '动摇';
    if (value < 60) return '沉沦';
    if (value < 80) return '迷失';
    return '深陷';
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
    return { type: 'corruption', label: '堕落值', value, rank: corruptionRank(value) };
  }

  function normalizedChanges(active, result) {
    const changes = Array.isArray(result?.relationshipChanges)
      ? result.relationshipChanges
      : [];
    return active.opponentIds.map((id, index) => {
      const raw = changes.find((entry) => entry?.opponentId === id) || changes[index] || {};
      const min = active.mode === 'spirit' ? -4 : -3;
      const max = active.mode === 'spirit' ? 3 : 4;
      return {
        opponentId: id,
        delta: clamp(raw.delta, min, max),
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
        const after = clamp(before + change.delta, 0, 100);
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
    sanitize,
    display,
    normalizedChanges,
    apply
  });
}(window));
