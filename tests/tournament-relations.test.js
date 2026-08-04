'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/TournamentRelations.js'),
  'utf8'
);
const affinity = {};
const window = {
  GameAffinity: {
    getSnapshot(id) {
      return { affinity: affinity[id] || 0, relationship: '初识' };
    },
    async adjust(id, delta) {
      affinity[id] = (affinity[id] || 0) + delta;
      return { delta };
    }
  }
};
vm.runInNewContext(source, { window, Math });

(async () => {
  const relations = window.GameTournamentRelations;
  const state = { corruption: { outsider: 10 } };
  const roster = [
    { id: 'disciple', name: '同门弟子' },
    { id: 'outsider', name: '外宗天骄' }
  ];
  const internal = {
    mode: 'internal',
    opponentIds: ['disciple'],
    roster
  };
  await relations.apply(state, internal, {
    relationshipChanges: [{ opponentId: 'disciple', delta: -2, reason: '出手过重' }]
  });
  assert.equal(affinity.disciple, -2);
  assert.equal(relations.display(roster[0], 'internal', state).label, '好感度');
  [
    [0, 'steadfast', '清正自持'],
    [15, 'steadfast', '清正自持'],
    [16, 'wavering', '道心动摇'],
    [50, 'wavering', '道心动摇'],
    [51, 'fallen', '沉沦渐深'],
    [90, 'fallen', '沉沦渐深'],
    [91, 'devoted', '彻底堕落'],
    [100, 'devoted', '彻底堕落']
  ].forEach(([value, id, label]) => {
    const stage = relations.corruptionStage(value);
    assert.equal(stage.id, id);
    assert.equal(stage.label, label);
  });

  const spirit = {
    mode: 'spirit',
    opponentIds: ['outsider'],
    roster
  };
  const changes = relations.normalizedChanges(spirit, {
    relationshipChanges: [{ opponentId: 'outsider', delta: 99, reason: '心境动摇' }]
  });
  assert.equal(changes[0].delta, 5);
  await relations.apply(state, spirit, { relationshipChanges: changes });
  assert.equal(state.corruption.outsider, 15);
  assert.equal(relations.normalizedChanges(spirit, {
    relationshipChanges: [{ opponentId: 'outsider', delta: 0 }]
  })[0].delta, 1);
  assert.equal(relations.normalizedChanges(spirit, {
    relationshipChanges: [{ opponentId: 'outsider', delta: -99 }]
  })[0].delta, -5);
  state.corruption.outsider = 0;
  await relations.apply(state, spirit, {
    relationshipChanges: [{ opponentId: 'outsider', delta: -4, reason: '边界反向波动' }]
  });
  assert.equal(state.corruption.outsider, 4);
  state.corruption.outsider = 100;
  const full = relations.display(roster[1], 'spirit', state);
  assert.equal(full.full, true);
  assert.equal(full.rank, '彻底堕落');
  assert.equal(full.tone.includes('热切'), true);
  assert.equal(full.battleDirective.includes('迎合'), true);
  await relations.apply(state, spirit, {
    relationshipChanges: [{ opponentId: 'outsider', delta: 3, reason: '边界反向波动' }]
  });
  assert.equal(state.corruption.outsider, 97);
  assert.equal(relations.display(roster[1], 'spirit', state).label, '堕落值');
  console.log('tournament relations test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
