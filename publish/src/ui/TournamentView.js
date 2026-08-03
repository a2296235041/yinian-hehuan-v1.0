(function installTournamentView(root) {
  'use strict';

  const ids = [
    'tournament-screen', 'tournament-title', 'tournament-subtitle', 'tournament-status',
    'tournament-roster', 'tournament-bracket', 'tournament-opponents',
    'tournament-history', 'tournament-score', 'tournament-start',
    'tournament-action-area', 'tournament-action-input', 'tournament-submit',
    'tournament-advance', 'tournament-claim', 'tournament-finish'
  ];
  let elements = null;

  function init() {
    elements = {};
    ids.forEach((id) => { elements[id] = document.getElementById(id); });
    return elements;
  }

  function node(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  }

  function profileById(active, id) {
    return root.GameTournamentRoster.getProfile(id, active?.roster);
  }

  function renderRoster(active, mode) {
    const profiles = active?.mode === mode
      ? active.roster
      : root.GameTournamentRoster.getCandidates(mode);
    elements['tournament-roster'].replaceChildren();
    profiles.forEach((profile) => {
      const card = node('article', 'tournament-roster-card');
      const badge = node('span', 'tournament-roster-badge', profile.name === '你'
        ? '你'
        : profile.name.slice(0, 1));
      const copy = node('div', 'tournament-roster-copy');
      copy.append(
        node('strong', '', profile.name),
        node('span', '', `${profile.faction} · ${profile.title}`),
        node('small', '', `${profile.physique}｜${profile.personality}`)
      );
      card.append(badge, copy);
      elements['tournament-roster'].append(card);
    });
  }

  function matchLabel(active, match) {
    const names = match.participants
      .map((id) => profileById(active, id)?.name || '待定')
      .join(match.participants.length === 3 ? ' · ' : ' vs ');
    const winner = profileById(active, match.winnerId)?.name;
    return winner ? `${names}  →  ${winner}` : names;
  }

  function renderBracket(active) {
    elements['tournament-bracket'].replaceChildren();
    if (!active) {
      elements['tournament-bracket'].append(node(
        'p', 'tournament-empty', '开启赛事后，十二人签表将在此生成。'
      ));
      return;
    }
    const rounds = [...(active.roundHistory || []), active.round].filter(Boolean);
    rounds.forEach((round) => {
      const section = node('section', 'tournament-round');
      section.append(node('h3', '', round.label));
      round.matches.forEach((match) => {
        const item = node('p', match.playerMatch ? 'is-player-match' : '', matchLabel(active, match));
        section.append(item);
      });
      elements['tournament-bracket'].append(section);
    });
  }

  function renderOpponents(active) {
    elements['tournament-opponents'].replaceChildren();
    (active?.opponentIds || []).forEach((id) => {
      const profile = profileById(active, id);
      if (!profile) return;
      const card = node('article', 'tournament-opponent-card');
      const portrait = node('div', 'tournament-portrait-placeholder', profile.name.slice(0, 1));
      portrait.append(node('small', '', profile.portrait_key ? '宗门立绘' : '立绘待绘制'));
      const details = node('div', 'tournament-opponent-copy');
      details.append(
        node('span', 'tournament-faction', profile.faction),
        node('h2', '', `${profile.name} · ${profile.title}`),
        node('p', '', profile.appearance),
        node('p', '', `性格：${profile.personality}`),
        node('p', '', `战法：${profile.combat_style}`),
        node('strong', '', `招牌式：${profile.signature_move}`)
      );
      card.append(portrait, details);
      elements['tournament-opponents'].append(card);
    });
  }

  function renderHistory(active) {
    elements['tournament-history'].replaceChildren();
    (active?.logs || []).forEach((entry) => {
      const row = node('p', 'tournament-log');
      row.append(node('strong', '', entry.speaker), document.createTextNode(entry.text));
      elements['tournament-history'].append(row);
    });
    elements['tournament-history'].scrollTop = elements['tournament-history'].scrollHeight;
  }

  function renderControls(active, mode, busy) {
    const day = Math.max(1, Number(root.Game?.player?.day) || 1);
    const cooldown = root.GameTournament.getState().cooldowns[mode] || 0;
    const sameMode = active?.mode === mode;
    const blocked = active && !sameMode;
    const canStart = !active && day >= cooldown;
    elements['tournament-start'].hidden = Boolean(active);
    elements['tournament-start'].disabled = !canStart || busy;
    elements['tournament-start'].textContent = blocked
      ? `请先完成${active.title}`
      : (cooldown > day ? `第 ${cooldown} 天再开` : '抽签入场');
    elements['tournament-action-area'].hidden = !sameMode || active.phase !== 'battle';
    elements['tournament-submit'].disabled = busy;
    elements['tournament-submit'].textContent = busy ? 'AI 裁决中 · 约 10–30 秒' : '施展此招';
    elements['tournament-advance'].hidden = !sameMode || active.phase !== 'round_complete';
    elements['tournament-advance'].disabled = busy;
    elements['tournament-claim'].hidden = !sameMode
      || active.phase !== 'event_complete' || !active.playerWon || active.rewardClaimed;
    elements['tournament-finish'].hidden = !sameMode || active.phase !== 'event_complete';
  }

  function render(state, mode, options = {}) {
    if (!elements) init();
    const active = state.active;
    const info = root.GameTournament.MODE_INFO[mode];
    elements['tournament-title'].textContent = info.title;
    elements['tournament-subtitle'].textContent = mode === 'spirit'
      ? '诸宗天骄齐聚，十二人争夺灵界魁首'
      : '同门切磋，十三位宗门人物中随机抽取十一人与玩家同场';
    const sameMode = active?.mode === mode ? active : null;
    const champion = sameMode ? profileById(sameMode, sameMode.championId)?.name : '';
    elements['tournament-status'].textContent = options.status || (sameMode
      ? (sameMode.phase === 'event_complete'
        ? `本届已结束 · 魁首：${champion || '待定'}`
        : `${sameMode.round.label} · 第 ${sameMode.turn + 1} 招`)
      : '赛事当前可开启，完成后需等待十天再次举办。');
    elements['tournament-score'].textContent = sameMode
      ? `你 ${sameMode.scores?.player || 0} : ${sameMode.scores?.opponent || 0} 对手`
      : '三回合累计判定';
    renderRoster(sameMode, mode);
    renderBracket(sameMode);
    renderOpponents(sameMode);
    renderHistory(sameMode);
    renderControls(active, mode, options.busy === true);
  }

  root.GameTournamentView = Object.freeze({ init, render });
}(window));
