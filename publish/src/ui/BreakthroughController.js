(function installBreakthroughController(root) {
  'use strict';

  let initialized = false;
  let button;
  let currentNpcId = null;
  let currentAffinity = null;
  let chatBusy = false;
  let busy = false;

  function refresh() {
    if (!button) return;
    const cultivation = root.GameCultivation.getSnapshot();
    const affinityEnough = Number(currentAffinity?.affinity) >= cultivation.requiredAffinity;
    button.disabled = busy || chatBusy || !cultivation.canBreakthrough || !affinityEnough;
    button.textContent = cultivation.canBreakthrough && currentAffinity && !affinityEnough
      ? `需好感${cultivation.requiredAffinity}`
      : '双修突破';
    if (!cultivation.canBreakthrough) {
      button.title = '当前境界尚未达到圆满';
    } else if (!affinityEnough) {
      button.title = `需要 NPC 好感达到 ${cultivation.requiredAffinity}`;
    } else {
      button.title = `与当前 NPC 双修，突破至${cultivation.nextRealmName}`;
    }
  }

  function showStatus(message, state = 'ready') {
    root.Game.EventBus.emit('ai-dialogue-status', { state, message });
  }

  async function breakthrough() {
    if (busy || !currentNpcId || !currentAffinity) return;
    busy = true;
    refresh();
    try {
      const result = await root.GameCultivation.breakthrough(
        currentNpcId,
        currentAffinity.affinity
      );
      if (!result.changed) {
        const message = result.reason === 'affinity_low'
          ? `好感需达到 ${result.snapshot.requiredAffinity} 才能双修突破。`
          : '修为尚未达到当前境界圆满。';
        root.GameAudio.sfx('deny');
        showStatus(message, 'error');
        return;
      }
      root.GameAudio.sfx('success');
      showStatus(`双修圆满，成功突破至${result.snapshot.realmName}。`);
      await root.GameAI.send(`我已借你相助突破至${result.snapshot.realmName}，多谢。`);
    } finally {
      busy = false;
      refresh();
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    button = document.getElementById('dialogue-breakthrough');
    button.addEventListener('click', breakthrough);
    root.Game.EventBus.on('ai-dialogue-open', (data) => {
      currentNpcId = data.npcId;
      currentAffinity = data.affinity;
      refresh();
    });
    root.Game.EventBus.on('affinity-changed', (data) => {
      if (data.npcId === currentNpcId) currentAffinity = data;
      refresh();
    });
    root.Game.EventBus.on('cultivation-changed', refresh);
    root.Game.EventBus.on('ai-dialogue-status', (data) => {
      chatBusy = ['opening', 'thinking', 'busy'].includes(data.state);
      refresh();
    });
    root.Game.EventBus.on('ai-dialogue-close', () => {
      currentNpcId = null;
      currentAffinity = null;
      chatBusy = false;
      refresh();
    });
    refresh();
  }

  root.GameBreakthrough = { init };
}(window));
