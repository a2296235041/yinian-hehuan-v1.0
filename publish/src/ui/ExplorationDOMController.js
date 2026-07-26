(function installExplorationDOMController(root) {
  'use strict';

  let uiScene = null;
  let currentRegion = null;
  let session = null;
  let active = false;
  let busy = false;
  let hiddenForBattle = false;
  let requestId = 0;

  function setBaseEnabled(enabled) {
    if (!uiScene) return;
    ['GameScene', 'UIScene'].forEach((key) => {
      const scene = uiScene.scene.get(key);
      if (scene?.input) scene.input.enabled = enabled;
    });
  }

  function showOverview() {
    requestId += 1;
    busy = false;
    currentRegion = null;
    session = null;
    root.GameExplorationDialogue.cancel();
    root.GameExplorationPanel.close();
    root.GameExplorationDOMView.showOverview(root.GameExploration.getRegions(), enterRegion);
  }

  function enterRegion(region) {
    if (!active || busy) return;
    currentRegion = region;
    session = root.GameExplorationDialogue.create(region);
    root.GameExplorationDOMView.showDetail(region, showOverview);
    root.GameExplorationPanel.open(region, session, {
      onSubmit: handleSubmit,
      onQuick: () => exploreCurrent(''),
      onBack: showOverview
    });
    root.GameExplorationPanel.setBusy(false, '');
  }

  function handleSubmit(text) {
    if (session?.result) continueConversation(text);
    else exploreCurrent(text);
  }

  async function continueConversation(text) {
    if (!session || busy) return;
    const current = session;
    const id = ++requestId;
    busy = true;
    root.GameExplorationDialogue.add(current, 'user', text);
    root.GameExplorationPanel.render(current);
    root.GameExplorationPanel.setBusy(true, 'AI 正在回应，预计数秒…');
    try {
      const generated = await root.GameExplorationDialogue.reply(current, text, (draft) => {
        if (id === requestId) root.GameExplorationPanel.render(current, draft);
      });
      if (id !== requestId) return;
      root.GameExplorationPanel.render(current);
      root.GameExplorationPanel.setBusy(false,
        generated.failed ? 'AI 暂时不可用，已显示本地回应。' : '');
    } finally {
      if (id === requestId) busy = false;
    }
  }

  async function startBattle(result, id) {
    root.GameExplorationPanel.setBusy(true, '正在准备战斗画面…');
    await root.Game.EnemyAssets.ensureKeyLoaded(uiScene, result.enemy.image_key);
    if (id !== requestId || !active) return;
    hiddenForBattle = true;
    root.GameExplorationPanel.hide();
    root.GameExplorationDOMView.hide();
    uiScene.scene.launch('BattleScene', { encounter: result });
  }

  async function exploreCurrent(intent) {
    if (!currentRegion || !session || busy) return;
    const region = currentRegion;
    const current = session;
    const id = ++requestId;
    busy = true;
    const action = intent || (current.result ? '继续向前探索。' : '观察四周并开始探索。');
    root.GameExplorationDialogue.add(current, 'user', action);
    root.GameExplorationPanel.render(current);
    root.GameExplorationPanel.setBusy(true, `正在${region.name}中探索…`);
    try {
      const result = await root.GameExploration.explore(region.id, intent);
      if (id !== requestId) return;
      root.GameExplorationDOMView.updatePlayer();
      if (['error', 'locked', 'stamina'].includes(result.type)) {
        root.GameExplorationDialogue.add(current, 'assistant', result.text);
        root.GameExplorationPanel.render(current);
        root.GameAudio.sfx('deny');
        return;
      }
      root.GameExplorationPanel.setBusy(true, 'AI 正在生成探索内容，预计数秒…');
      const generated = await root.GameExplorationDialogue.describe(current, result, (draft) => {
        if (id === requestId) root.GameExplorationPanel.render(current, draft);
      });
      if (id !== requestId) return;
      root.GameExplorationPanel.render(current);
      root.GameExplorationPanel.setMode(true);
      if (result.type === 'battle') return startBattle(result, id);
      root.GameAudio.sfx('success');
      root.GameExplorationPanel.setBusy(false,
        generated.failed ? 'AI 暂时不可用，已显示固定探索结果。' : '');
    } catch (error) {
      console.error('DOM 探险结算失败:', error.code || '', error.message, error.stack);
      root.GameExplorationPanel.setBusy(false, '这次探索未能完成，请稍后重试。');
      hiddenForBattle = false;
      root.GameExplorationDOMView.show();
    } finally {
      if (id === requestId) busy = false;
      if (!hiddenForBattle) root.GameExplorationPanel.setBusy(false);
    }
  }

  function handleBattleResult(result) {
    if (!active || !session) return;
    root.GameExplorationDialogue.add(session, 'assistant', result?.text || '战斗结束。');
    root.GameExplorationPanel.render(session);
    root.GameExplorationDOMView.updatePlayer();
  }

  function resumeAfterBattle() {
    if (!active) return;
    hiddenForBattle = false;
    root.GameExplorationDOMView.show();
    root.GameExplorationPanel.show();
    root.GameExplorationPanel.render(session);
    root.GameExplorationPanel.setMode(Boolean(session?.result));
    root.GameExplorationPanel.setBusy(false, '');
    setBaseEnabled(false);
  }

  function close() {
    if (!active || hiddenForBattle) return;
    requestId += 1;
    active = false;
    busy = false;
    root.GameExplorationDialogue.cancel();
    root.GameExplorationPanel.close();
    root.GameExplorationDOMView.hide();
    root.GameModelUI.setMode('compact');
    root.Game.EventBus.off('exploration-result', handleBattleResult);
    root.Game.EventBus.off('player-state-changed', root.GameExplorationDOMView.updatePlayer);
    setBaseEnabled(true);
    root.GameAudio.sfx('click');
  }

  function open(scene) {
    if (active) return;
    uiScene = scene;
    active = true;
    hiddenForBattle = false;
    root.GameExplorationDOMView.init(close);
    root.GameExplorationDOMView.show();
    root.GameModelUI.setMode('hidden');
    setBaseEnabled(false);
    root.Game.EventBus.on('exploration-result', handleBattleResult);
    root.Game.EventBus.on('player-state-changed', root.GameExplorationDOMView.updatePlayer);
    showOverview();
  }

  root.GameExplorationDOM = { open, close, resumeAfterBattle, isOpen: () => active };
}(window));
