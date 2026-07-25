(function installExplorationDOMView(root) {
  'use strict';

  let refs;

  function elements() {
    if (refs) return refs;
    refs = {
      screen: document.getElementById('exploration-screen'),
      title: document.getElementById('exploration-screen-title'),
      player: document.getElementById('exploration-player-info'),
      status: document.getElementById('exploration-screen-status'),
      grid: document.getElementById('exploration-region-grid'),
      detail: document.getElementById('exploration-region-detail'),
      detailName: document.getElementById('exploration-region-name'),
      detailDescription: document.getElementById('exploration-region-description'),
      detailMeta: document.getElementById('exploration-region-meta'),
      close: document.getElementById('exploration-screen-close'),
      back: document.getElementById('exploration-region-back')
    };
    return refs;
  }

  function assetPath(regionId) {
    return root.Game.ExplorationAssets.entries[regionId]?.[1] || '';
  }

  function setBackground(regionId) {
    const path = assetPath(regionId);
    elements().screen.style.backgroundImage = path
      ? `linear-gradient(rgba(6,16,13,.62), rgba(6,16,13,.82)), url("${path}")`
      : '';
  }

  function updatePlayer() {
    const stats = root.GamePlayerStats.getSnapshot();
    const player = root.Game.player;
    elements().player.textContent = [
      `${stats.originName} · ${stats.realmLabel}`,
      `精力 ${player.stamina}/${player.maxStamina}`,
      `气血 ${stats.maxHp}`,
      `攻击 ${stats.attack}`
    ].join('　');
  }

  function regionCard(region, onSelect) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'exploration-region-card';
    button.disabled = !region.unlocked;
    const path = assetPath(region.id);
    if (path) {
      const image = document.createElement('img');
      image.src = path;
      image.alt = '';
      button.append(image);
    }
    const content = document.createElement('span');
    content.className = 'exploration-region-card-content';
    const name = document.createElement('strong');
    name.textContent = region.name;
    const meta = document.createElement('small');
    meta.textContent = region.unlocked
      ? `险度 ${region.danger} · 精力 -${region.stamina_cost}`
      : `${root.GameCultivation.getRealmName(region.required_realm)}解锁`;
    const description = document.createElement('span');
    description.textContent = region.description;
    content.append(name, meta, description);
    button.append(content);
    if (region.unlocked) button.addEventListener('click', () => onSelect(region));
    return button;
  }

  function showOverview(regions, onSelect) {
    const ui = elements();
    ui.title.textContent = '出山探险';
    ui.status.textContent = '选择一处区域，查看其中的机缘与风险。';
    ui.detail.hidden = true;
    ui.grid.hidden = false;
    ui.grid.replaceChildren(...regions.map((region) => regionCard(region, onSelect)));
    setBackground('');
    updatePlayer();
  }

  function showDetail(region, onBack) {
    const ui = elements();
    ui.title.textContent = `出山探险 · ${region.name}`;
    ui.detailName.textContent = region.name;
    ui.detailDescription.textContent = region.description;
    ui.detailMeta.textContent =
      `险度 ${region.danger}　·　消耗精力 ${region.stamina_cost}　·　可遇见 ${(region.npc_ids || []).length} 位熟人`;
    ui.grid.hidden = true;
    ui.detail.hidden = false;
    ui.back.onclick = onBack;
    ui.status.textContent = '山风已定，四周灵机清晰可察。';
    setBackground(region.id);
    updatePlayer();
  }

  function init(onClose) {
    elements().close.onclick = onClose;
  }

  root.GameExplorationDOMView = {
    init,
    show: () => { elements().screen.hidden = false; },
    hide: () => { elements().screen.hidden = true; },
    showOverview,
    showDetail,
    updatePlayer,
    setStatus: (message) => { elements().status.textContent = message || ''; }
  };
}(window));
