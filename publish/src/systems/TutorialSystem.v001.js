(function installTutorialSystem(root) {
  'use strict';

  const steps = [
    {
      title: '第一步 · 认识山门',
      body: '先去迎仙阁报到。这里是你在合欢宗遇见第一位师姐的地方。',
      target: { x: 70, y: 100, width: 310, height: 250 }
    },
    {
      title: '第二步 · 结识苏媚儿',
      body: '点击苏媚儿的立绘，打开人物对话。她会成为你认识宗门的第一扇门。',
      target: { x: 125, y: 125, width: 400, height: 485 }
    },
    {
      title: '第三步 · 说出第一句话',
      body: '在输入框写下你想说的话，再点击发送。每位 NPC 都会根据性格回应你。',
      target: { type: 'dom', selector: '#dialogue-input' }
    },
    {
      title: '第四步 · 收起对话',
      body: '读完她的回应后，点击右上角关闭对话，回到山门继续修行。',
      target: { type: 'dom', selector: '#dialogue-close' }
    },
    {
      title: '第五步 · 先让自己变强',
      body: '回到山门后点击修炼。修为会增长，但会消耗今日精力与修炼次数。',
      target: { x: 885, y: 642, width: 125, height: 70 }
    },
    {
      title: '第六步 · 查看储物袋',
      body: '打开储物袋，看看你随身携带的灵物。物品可以用于修炼，也可以赠予 NPC。',
      target: { x: 1115, y: 642, width: 125, height: 70 }
    },
    {
      title: '第七步 · 认识你的灵物',
      body: '这里会显示灵石、丹药和礼物。点击右上角返回，继续完成今天的拜访。',
      target: { x: 245, y: 120, width: 790, height: 480 }
    },
    {
      title: '第八步 · 回到山门总览',
      body: '储物袋关闭后会回到山门总览。点击迎仙阁的标记，继续去见苏媚儿。',
      target: { x: 70, y: 100, width: 310, height: 250 }
    },
    {
      title: '第九步 · 再见苏媚儿',
      body: '再次点击苏媚儿的立绘，打开刚才熟悉的对话面板。',
      target: { x: 125, y: 125, width: 400, height: 485 }
    },
    {
      title: '第十步 · 送出一份心意',
      body: '打开赠礼面板，选择一件礼物送给她。好感提升后，会解锁更多互动与突破机会。',
      target: { type: 'dom', selector: '#dialogue-gift' }
    }
  ];
  let active = false;
  let stepIndex = 0;
  let ready = Promise.resolve();

  function render() {
    const step = steps[stepIndex];
    if (!step) {
      root.GameTutorialOverlay.show({
        title: '山门已为你打开',
        body: '你已经掌握了宗门的基本节奏。接下来，可以自由探索六处场景，结识更多人物。',
        progress: '引导完成'
      }, finish, true);
      return;
    }
    root.GameTutorialOverlay.show({
      ...step,
      progress: `${stepIndex + 1} / ${steps.length}`
    }, skip);
  }

  function save(next) {
    return root.GameTutorialState.save({
      started: true,
      completed: false,
      step: next
    });
  }

  function move(next) {
    if (!active || next <= stepIndex) return;
    stepIndex = next;
    void save(stepIndex);
    render();
  }

  function start(payload) {
    return ready.then((saved) => {
      if (!payload?.newGame && !saved.started) return;
      if (saved.completed) return;
      active = true;
      stepIndex = Math.min(saved.step, steps.length - 1);
      void save(stepIndex);
      render();
    });
  }

  function skip() {
    if (!active) return;
    active = false;
    root.GameTutorialOverlay.hide();
    void root.GameTutorialState.save({ started: true, completed: true, step: steps.length });
  }

  function finish() {
    active = false;
    root.GameTutorialOverlay.hide();
    void root.GameTutorialState.save({ started: true, completed: true, step: steps.length });
    root.GameAudio?.sfx?.('success');
  }

  function onBuilding(data) {
    if (data?.id === 'welcome-pavilion' && stepIndex === 0) move(1);
    else if (data?.id === 'welcome-pavilion' && stepIndex === 7) move(8);
  }

  function onDialogueOpen(data) {
    if (data?.npcId === 'su_meier' && stepIndex === 1) move(2);
    else if (data?.npcId === 'su_meier' && stepIndex === 8) move(9);
  }

  function init() {
    root.GameTutorialOverlay.create();
    ready = root.GameTutorialState.load();
    root.Game.EventBus.on('tutorial-game-ready', start);
    root.Game.EventBus.on('tutorial-building-opened', onBuilding);
    root.Game.EventBus.on('ai-dialogue-open', onDialogueOpen);
    root.Game.EventBus.on('tutorial-dialogue-sent', (data) => {
      if (data?.npcId === 'su_meier' && stepIndex === 2) move(3);
    });
    root.Game.EventBus.on('ai-dialogue-close', () => {
      if (stepIndex === 3) move(4);
    });
    root.Game.EventBus.on('cultivation-changed', (data) => {
      if (data?.source === 'cultivate' && stepIndex === 4) move(5);
    });
    root.Game.EventBus.on('tutorial-inventory-opened', () => {
      if (stepIndex === 5) move(6);
    });
    root.Game.EventBus.on('tutorial-inventory-closed', () => {
      if (stepIndex !== 6) return;
      root.Game.EventBus.emit('tutorial-return-to-sect-map');
      move(7);
    });
    root.Game.EventBus.on('affinity-changed', (data) => {
      if (data?.npcId === 'su_meier' && data?.source === 'gift' && stepIndex === 9) {
        move(steps.length);
      }
    });
  }

  root.GameTutorial = Object.freeze({ init, skip, replay: () => {
    stepIndex = 0;
    active = true;
    void root.GameTutorialState.save({ started: true, completed: false, step: 0 });
    render();
  }});
}(window));
