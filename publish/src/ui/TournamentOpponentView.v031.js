(function installTournamentOpponentView(root) {
  'use strict';

  let expandedIds = new Set();
  let matchKey = '';

  function node(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  }

  function avatar(profile) {
    const frame = node('span', 'tournament-opponent-avatar');
    const portraitPath = profile.portrait_key
      ? root.Game?.NpcCardRenderer?.portraitPath?.(profile.id)
      : '';
    if (portraitPath) {
      const image = node('img');
      image.src = portraitPath;
      image.alt = '';
      frame.append(image);
    } else {
      frame.append(node('strong', '', profile.name.slice(0, 1)));
    }
    return frame;
  }

  function relationBadge(profile, mode, state) {
    const relation = root.GameTournamentRelations.display(profile, mode, state);
    if (!relation) return null;
    return node(
      'span',
      `tournament-relation is-${relation.type}`,
      `${relation.label} ${relation.value} · ${relation.rank}`
    );
  }

  function field(label, value, wide = false) {
    const row = node('p', `tournament-opponent-field${wide ? ' is-wide' : ''}`);
    row.append(node('b', '', label), node('span', '', value || '暂无记录'));
    return row;
  }

  function applyState(card, toggle, details, profile) {
    const expanded = expandedIds.has(profile.id);
    card.classList.toggle('is-expanded', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.title = expanded ? '收起人物详情' : '展开人物详情';
    details.hidden = !expanded;
  }

  function createCard(container, active, state, profile) {
    const card = node('article', 'tournament-opponent-card');
    const toggle = node('button', 'tournament-opponent-toggle');
    toggle.type = 'button';
    const heading = node('span', 'tournament-opponent-heading');
    heading.append(
      node('strong', '', profile.name),
      node('span', '', `${profile.faction} · ${profile.title}`)
    );
    const chevron = node('span', 'tournament-opponent-chevron');
    chevron.setAttribute('aria-hidden', 'true');
    toggle.append(avatar(profile), heading, chevron);

    const details = node('div', 'tournament-opponent-details');
    const summary = node('div', 'tournament-opponent-summary');
    summary.append(
      node('span', 'tournament-faction', `${profile.faction} · ${profile.title}`)
    );
    const relation = relationBadge(profile, active.mode, state);
    if (relation) summary.append(relation);
    const fields = node('div', 'tournament-opponent-fields');
    fields.append(
      field('体态', profile.physique),
      field('招牌式', profile.signature_move),
      field('外貌', profile.appearance, true),
      field('性格', profile.personality, true),
      field('战法', profile.combat_style, true)
    );
    details.append(summary, fields);
    applyState(card, toggle, details, profile);
    toggle.addEventListener('click', () => {
      if (expandedIds.has(profile.id)) expandedIds.delete(profile.id);
      else {
        expandedIds.clear();
        expandedIds.add(profile.id);
      }
      root.GameAudio?.sfx?.('click');
      render(container, active, state);
    });
    card.append(toggle, details);
    return card;
  }

  function render(container, active, state) {
    const opponents = active?.opponentIds || [];
    const nextKey = `${active?.id || ''}:${opponents.join(',')}`;
    if (nextKey !== matchKey) {
      matchKey = nextKey;
      expandedIds = new Set();
    }
    container.replaceChildren();
    opponents.forEach((id) => {
      const profile = root.GameTournamentRoster.getProfile(id, active?.roster);
      if (profile) container.append(createCard(container, active, state, profile));
    });
  }

  root.GameTournamentOpponentView = Object.freeze({ render });
}(window));
