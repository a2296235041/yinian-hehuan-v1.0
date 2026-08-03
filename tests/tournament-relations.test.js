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

  const spirit = {
    mode: 'spirit',
    opponentIds: ['outsider'],
    roster
  };
  const changes = relations.normalizedChanges(spirit, {
    relationshipChanges: [{ opponentId: 'outsider', delta: 99, reason: '心境动摇' }]
  });
  assert.equal(changes[0].delta, 3);
  await relations.apply(state, spirit, { relationshipChanges: changes });
  assert.equal(state.corruption.outsider, 13);
  assert.equal(relations.display(roster[1], 'spirit', state).label, '堕落值');
  console.log('tournament relations test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
