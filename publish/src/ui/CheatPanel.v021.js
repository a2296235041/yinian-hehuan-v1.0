(function installCheatPanel(root) {
  'use strict';

  let panel = null;
  let busy = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function createMarkup() {
    panel = document.createElement('section');
    panel.id = 'cheat-panel';
    panel.className = 'cheat-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="cheat-dialog" role="dialog" aria-modal="true" aria-labelledby="cheat-title">
        <header>
          <h2 id="cheat-title">仙界攻略系统</h2>
          <button id="cheat-close" type="button" aria-label="关闭" title="关闭">×</button>
        </header>
        <div class="cheat-scroll">
          <section class="cheat-section">
            <h3>角色好感</h3>
            <div class="cheat-fields">
              <label><span>角色</span><select id="cheat-npc" class="cheat-control"></select></label>
              <label><span>好感度</span><input id="cheat-affinity" class="cheat-control"
                type="number" min="-100" max="100" step="1" inputmode="numeric"></label>
              <button id="cheat-affinity-apply" class="cheat-control" type="button">应用</button>
            </div>
            <output id="cheat-affinity-current"></output>
          </section>
          <section class="cheat-section">
            <h3>修为境界</h3>
            <div class="cheat-fields">
              <label><span>境界</span><select id="cheat-realm" class="cheat-control"></select></label>
              <label><span>阶段</span><select id="cheat-phase" class="cheat-control">
                <option value="early">初期</option><option value="middle">中期</option>
                <option value="late">后期</option><option value="complete">圆满</option>
              </select></label>
              <button id="cheat-realm-apply" class="cheat-control" type="button">应用</button>
            </div>
            <output id="cheat-realm-current"></output>
          </section>
          <section class="cheat-section cheat-toggle-row">
            <div><h3>单日精力</h3><output id="cheat-stamina-current"></output></div>
            <label class="cheat-switch">
              <input id="cheat-unlimited" class="cheat-control" type="checkbox">
              <span aria-hidden="true"></span>
            </label>
          </section>
          <section class="cheat-section cheat-toggle-row">
            <div><h3>灵石数量</h3><output>直接增加大量灵石</output></div>
            <button id="cheat-stones-add" class="cheat-control" type="button">+9,999,999</button>
          </section>
          <p id="cheat-status" class="cheat-status" aria-live="polite"></p>
        </div>
      </div>`;
    byId('game-shell').append(panel);
  }

  function npcList() {
    const scene = root.game?.scene?.getScene('GameScene');
    return [...(scene?.npcSystem?.getAllNpcs?.().values?.() || [])];
  }

  function fillOptions() {
    const npcSelect = byId('cheat-npc');
    npcSelect.replaceChildren(...npcList().map((npc) => {
      const option = document.createElement('option');
      option.value = npc.id;
      option.textContent = `${npc.name} · ${npc.title}`;
      return option;
    }));
    const realmSelect = byId('cheat-realm');
    const levels = root.Game?.Data?.cultivationLevels?.levels || [];
    realmSelect.replaceChildren(...levels.map((level, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = level.name;
      return option;
    }));
  }

  function setStatus(message, type = '') {
    const status = byId('cheat-status');
    status.textContent = message;
    status.dataset.type = type;
  }

  function setBusy(next) {
    busy = next;
    panel.querySelectorAll('.cheat-control').forEach((control) => {
      control.disabled = next;
    });
  }

  function refreshAffinity() {
    const npcId = byId('cheat-npc').value;
    if (!npcId) return;
    const current = root.GameAffinity.getSnapshot(npcId);
    byId('cheat-affinity').value = String(current.affinity);
    byId('cheat-affinity-current').textContent =
      `当前 ${current.affinity} · ${current.relationship}`;
  }

  function refreshRealm() {
    const current = root.GameCultivation.getSnapshot();
    byId('cheat-realm').value = String(current.realmIndex);
    byId('cheat-realm-current').textContent =
      `当前 ${current.label} · 修为 ${current.progress}/${current.required}`;
  }

  function refreshStamina() {
    const enabled = root.GameCheat.getSnapshot().unlimitedStamina;
    byId('cheat-unlimited').checked = enabled;
    byId('cheat-stamina-current').textContent = enabled ? '无限' : '常规';
  }

  async function run(action, successText) {
    if (busy) return;
    setBusy(true);
    setStatus('正在同步…');
    try {
      const result = await action();
      root.GameAudio?.sfx?.('success');
      root.GamePersistenceStatus?.report?.('攻略系统操作', result);
      setStatus(result?.syncMessage ? `${successText}，${result.syncMessage}` : successText, 'success');
    } catch (error) {
      console.error('攻略系统操作失败:', error.code || '', error.message, error.stack);
      root.GameAudio?.sfx?.('deny');
      setStatus(error.message || '操作失败，请稍后重试', 'error');
    } finally {
      setBusy(false);
      refreshAffinity();
      refreshRealm();
      refreshStamina();
    }
  }

  async function open() {
    await Promise.all([root.Game.systemsReady || Promise.resolve(), root.GameCheat.initialize()]);
    fillOptions();
    refreshAffinity();
    refreshRealm();
    refreshStamina();
    setStatus('');
    panel.hidden = false;
  }

  function close() {
    if (panel) panel.hidden = true;
  }

  function bindEvents() {
    byId('cheat-close').addEventListener('click', close);
    panel.addEventListener('pointerdown', (event) => {
      if (event.target === panel) close();
    });
    byId('cheat-npc').addEventListener('change', refreshAffinity);
    byId('cheat-affinity-apply').addEventListener('click', () => run(
      () => root.GameCheat.setAffinity(byId('cheat-npc').value, byId('cheat-affinity').value),
      '角色好感已修改'
    ));
    byId('cheat-realm-apply').addEventListener('click', () => run(
      () => root.GameCheat.setRealm(byId('cheat-realm').value, byId('cheat-phase').value),
      '玩家境界已修改'
    ));
    byId('cheat-unlimited').addEventListener('change', (event) => run(
      () => root.GameCheat.setUnlimitedStamina(event.target.checked),
      event.target.checked ? '无限精力已开启' : '无限精力已关闭'
    ));
    byId('cheat-stones-add').addEventListener('click', () => run(
      () => root.GameCheat.addSpiritStones(9999999),
      '灵石已增加 9,999,999'
    ));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !panel.hidden) close();
    });
  }

  function init() {
    if (panel) return;
    createMarkup();
    bindEvents();
  }

  root.GameCheatPanel = Object.freeze({ init, open, close });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}(window));
