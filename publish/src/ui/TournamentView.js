(function installTournamentView(root) {
  'use strict';

  const ids = [
    'tournament-screen', 'tournament-title', 'tournament-subtitle', 'tournament-status',
    'tournament-roster', 'tournament-bracket', 'tournament-opponents',
    'tournament-history', 'tournament-score', 'tournament-start',
    'tournament-action-area', 'tournament-action-input', 'tournament-submit',
    'tournament-advance', 'tournament-claim', 'tournament-finish',
    'tournament-matchmaking', 'tournament-draw-mode', 'tournament-opponent-field',
    'tournament-opponent-select', 'tournament-matchmaking-note'
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

  function renderRoster(active, mode, state) {
    const profiles = active?.mode === mode
      ? active.roster
      : root.GameTournamentRoster.getCandidates(mode);
    root.GameTournamentParticipantView.renderRoster(
      elements['tournament-roster'], profiles, mode, state
    );
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

  function renderHistory(active) {
    elements['tournament-history'].replaceChildren();
    (active?.logs || []).forEach((entry) => {
      const special = entry.kind === 'opponent-response'
        || entry.speaker === '对局回应' || entry.speaker === '战况综述'
        ? ' is-global'
        : (entry.speaker === '裁判判决'
          ? ' is-hint'
          : (entry.speaker === '关系变化'
            ? ' is-relation'
            : (entry.speaker === '签表异动' ? ' is-tamper' : '')));
      const row = node('p', `tournament-log${special}`);
      row.append(
        node('strong', '', entry.speaker),
        document.createTextNode(`：${entry.text}`)
      );
      elements['tournament-history'].append(row);
    });
    elements['tournament-history'].scrollTop = elements['tournament-history'].scrollHeight;
  }

  function renderMatchmaking(active, mode, busy) {
    const sameMode = active?.mode === mode;
    const choosingNext = sameMode && active.phase === 'round_complete';
    const visible = !active || choosingNext;
    elements['tournament-matchmaking'].hidden = !visible;
    if (!visible) return;
    const entrantIds = choosingNext ? active.pendingEntrants || [] : null;
    const profiles = entrantIds
      ? entrantIds.filter((id) => id !== 'player').map((id) => profileById(active, id))
      : root.GameTournamentRoster.getCandidates(mode);
    const candidates = profiles.filter(Boolean);
    const finalRound = choosingNext && entrantIds.length === 3;
    const method = elements['tournament-draw-mode'];
    const selected = elements['tournament-opponent-select'];
    const previous = selected.value;
    if (finalRound) method.value = 'random';
    method.disabled = busy || finalRound;
    selected.replaceChildren(...candidates.map((profile) => {
      const option = node('option', '', `${profile.name} · ${profile.faction} · 战力 ${profile.power}`);
      option.value = profile.id;
      return option;
    }));
    if (candidates.some((profile) => profile.id === previous)) selected.value = previous;
    const tampering = method.value === 'tamper' && !finalRound;
    elements['tournament-opponent-field'].hidden = !tampering;
    selected.disabled = busy || !tampering;
    elements['tournament-matchmaking-note'].textContent = finalRound
      ? '问鼎战三人同台，两名对手都会登场，无法篡改为单独对阵。'
      : (tampering
        ? '篡改签文会锁定你的对手，其余签位仍按赛事规则生成。'
        : '听从正常抽签，对手将由签表随机决定。');
  }

  function renderControls(active, mode, busy) {
    const day = Math.max(1, Number(root.Game?.player?.day) || 1);
    const cooldown = root.GameTournament.getState().cooldowns[mode] || 0;
    const sameMode = active?.mode === mode;
    const blocked = active && !sameMode;
    const canStart = !active && day >= cooldown;
    const tampering = elements['tournament-draw-mode'].value === 'tamper'
      && !elements['tournament-draw-mode'].disabled;
    elements['tournament-start'].hidden = Boolean(active);
    elements['tournament-start'].disabled = !canStart || busy;
    elements['tournament-start'].textContent = blocked
      ? `请先完成${active.title}`
      : (cooldown > day ? `第 ${cooldown} 天再开` : (tampering ? '篡改签文入场' : '抽签入场'));
    elements['tournament-action-area'].hidden = !sameMode || active.phase !== 'battle';
    elements['tournament-submit'].disabled = busy;
    elements['tournament-submit'].textContent = busy ? 'AI 裁决中 · 约 10–30 秒' : '施展此招';
    elements['tournament-advance'].hidden = !sameMode || active.phase !== 'round_complete';
    elements['tournament-advance'].disabled = busy;
    elements['tournament-advance'].textContent = tampering ? '篡改下一轮签文' : '进入下一轮';
    elements['tournament-claim'].hidden = !sameMode
      || active.phase !== 'event_complete' || !active.playerWon || active.rewardClaimed;
    elements['tournament-finish'].hidden = !sameMode
      || active.phase !== 'event_complete'
      || (active.playerWon && !active.rewardClaimed);
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
      : (active
        ? `当前已有进行中的${active.title}，请从山门进入对应赛事。`
        : '赛事当前可开启，完成后需等待十天再次举办。'));
    elements['tournament-score'].textContent = sameMode
      ? `你 ${sameMode.scores?.player || 0} : ${sameMode.scores?.opponent || 0} 对手`
      : '三回合累计判定';
    renderRoster(sameMode, mode, state);
    renderBracket(sameMode);
    root.GameTournamentParticipantView.renderOpponents(
      elements['tournament-opponents'], sameMode, state
    );
    renderHistory(sameMode);
    renderMatchmaking(active, mode, options.busy === true);
    renderControls(active, mode, options.busy === true);
  }

  root.GameTournamentView = Object.freeze({ init, render });
}(window));
