'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
  }

  toggle(name, active) {
    const names = new Set(this.owner.className.split(/\s+/).filter(Boolean));
    if (active) names.add(name);
    else names.delete(name);
    this.owner.className = [...names].join(' ');
  }
}

class FakeElement {
  constructor(tag) {
    this.tag = tag;
    this.className = '';
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.hidden = false;
    this.textContent = '';
    this.classList = new FakeClassList(this);
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  addEventListener(name, listener) {
    this.listeners[name] = listener;
  }

  click() {
    this.listeners.click();
  }
}

function textOf(element) {
  return `${element.textContent}${element.children.map(textOf).join('')}`;
}

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/ui/TournamentParticipantView.v032.js'),
  'utf8'
);
const profiles = [{
  id: 'rival',
  name: '顾清罗',
  faction: '凌霄剑阁',
  title: '霜锋首席',
  physique: '高挑纤长',
  appearance: '墨发齐腰，白衣覆冰蓝轻甲。',
  personality: '自律严谨，认可强者。',
  combat_style: '以寒气封锁退路。',
  signature_move: '一线霜天',
  portrait_key: ''
}];
const window = {
  GameTournamentRoster: {
    getProfile(id) { return profiles.find((profile) => profile.id === id); }
  },
  GameTournamentRelations: {
    display() {
      return {
        type: 'corruption',
        label: '堕落值',
        value: 12,
        rank: '清正自持',
        full: false
      };
    }
  },
  GameAudio: { sfx() {} }
};
const document = { createElement: (tag) => new FakeElement(tag) };
vm.runInNewContext(source, { window, document, Set, Object });

const container = new FakeElement('div');
const active = { id: 'event-1', mode: 'spirit', opponentIds: ['rival'], roster: profiles };
window.GameTournamentParticipantView.renderOpponents(
  container, active, { corruption: { rival: 12 } }
);

assert.equal(container.children.length, 1);
assert.equal(container.children[0].children[1].hidden, true);
assert.equal(container.children[0].children[0].attributes['aria-expanded'], 'false');
assert.equal(textOf(container.children[0].children[0]).includes('顾清罗'), true);

container.children[0].children[0].click();
assert.equal(container.children[0].className.includes('is-expanded'), true);
assert.equal(container.children[0].children[1].hidden, false);
assert.equal(container.children[0].children[0].attributes['aria-expanded'], 'true');
const expandedText = textOf(container.children[0]);
['高挑纤长', '墨发齐腰', '自律严谨', '寒气封锁', '一线霜天', '堕落值 12', '清正自持']
  .forEach((value) => assert.equal(expandedText.includes(value), true));

container.children[0].children[0].click();
assert.equal(container.children[0].children[1].hidden, true);

const roster = new FakeElement('div');
window.GameTournamentParticipantView.renderRoster(
  roster, profiles, 'spirit', { corruption: { rival: 12 } }
);
assert.equal(roster.children[0].children[1].hidden, true);
roster.children[0].children[0].click();
assert.equal(roster.children[0].className.includes('is-expanded'), true);
assert.equal(roster.children[0].children[1].hidden, false);
assert.equal(textOf(roster.children[0]).includes('一线霜天'), true);
roster.children[0].children[0].click();
assert.equal(roster.children[0].children[1].hidden, true);
console.log('tournament participant view test passed');
