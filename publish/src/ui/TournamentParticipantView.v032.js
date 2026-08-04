(function installTournamentParticipantView(root) {
  'use strict';

  let expandedIds = new Set();
  let matchKey = '';
  let rosterExpandedId = '';
  let rosterKey = '';

  function node(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  }

  function avatar(profile, className = 'tournament-opponent-avatar') {
    const frame = node('span', className);
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
    const full = relation.full ? ' · 满值' : '';
    return node(
      'span',
      `tournament-relation is-${relation.type}`,
      `${relation.label} ${relation.value} · ${relation.rank}${full}`
    );
  }

  function field(label, value, wide = false) {
    const row = node('p', `tournament-opponent-field${wide ? ' is-wide' : ''}`);
    row.append(node('b', '', label), node('span', '', value || '暂无记录'));
    return row;
  }

  function applyState(card, toggle, details, expanded) {
    card.classList.toggle('is-expanded', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.title = expanded ? '收起人物详情' : '展开人物详情';
    details.hidden = !expanded;
  }

  function profileDetails(profile, mode, state) {
    const details = node('div', 'tournament-opponent-details');
    const summary = node('div', 'tournament-opponent-summary');
    summary.append(node('span', 'tournament-faction', `${profile.faction} · ${profile.title}`));
    const relation = relationBadge(profile, mode, state);
    if (relation) summary.append(relation);
    const fields = node('div', 'tournament-opponent-fields');
    fields.append(
      field(
        '战斗',
        `战力 ${profile.power} · 气血 ${profile.maxHp} · 攻 ${profile.attack}`
        + ` · 防 ${profile.defense} · 速 ${profile.speed}`,
        true
      ),
      field('体态', profile.physique),
      field('招牌式', profile.signature_move),
      field('外貌', profile.appearance, true),
      field('性格', profile.personality, true),
      field('战法', profile.combat_style, true)
    );
    details.append(summary, fields);
    return details;
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

    const details = profileDetails(profile, active.mode, state);
    applyState(card, toggle, details, expandedIds.has(profile.id));
    toggle.addEventListener('click', () => {
      if (expandedIds.has(profile.id)) expandedIds.delete(profile.id);
      else {
        expandedIds.clear();
        expandedIds.add(profile.id);
      }
      root.GameAudio?.sfx?.('click');
      renderOpponents(container, active, state);
    });
    card.append(toggle, details);
    return card;
  }

  function renderOpponents(container, active, state) {
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

  function createRosterCard(container, profiles, profile, mode, state) {
    const card = node('article', 'tournament-roster-card');
    const toggle = node('button', 'tournament-roster-toggle');
    toggle.type = 'button';
    const copy = node('span', 'tournament-roster-copy');
    copy.append(
      node('strong', '', profile.name),
      node('span', '', `${profile.faction} · ${profile.title}`)
    );
    const relation = relationBadge(profile, mode, state);
    if (relation) copy.append(relation);
    copy.append(node('small', '', `${profile.physique}｜${profile.personality}`));
    const chevron = node('span', 'tournament-roster-chevron');
    chevron.setAttribute('aria-hidden', 'true');
    toggle.append(avatar(profile, 'tournament-roster-badge'), copy, chevron);
    const details = profileDetails(profile, mode, state);
    applyState(card, toggle, details, rosterExpandedId === profile.id);
    toggle.addEventListener('click', () => {
      rosterExpandedId = rosterExpandedId === profile.id ? '' : profile.id;
      root.GameAudio?.sfx?.('click');
      renderRoster(container, profiles, mode, state);
    });
    card.append(toggle, details);
    return card;
  }

  function renderRoster(container, profiles, mode, state) {
    const nextKey = `${mode}:${profiles.map((profile) => profile.id).join(',')}`;
    if (nextKey !== rosterKey) {
      rosterKey = nextKey;
      rosterExpandedId = '';
    }
    container.replaceChildren();
    profiles.forEach((profile) => {
      container.append(createRosterCard(container, profiles, profile, mode, state));
    });
  }

  root.GameTournamentParticipantView = Object.freeze({ renderOpponents, renderRoster });
}(window));
