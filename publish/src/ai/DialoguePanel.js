(function installDialoguePanel(root) {
  'use strict';

  let initialized = false;
  let panel;
  let history;
  let name;
  let title;
  let affinityText;
  let status;
  let input;
  let sendButton;
  let giftButton;
  let drawButton;
  let imageModal;
  let imageStatus;
  let image;
  let currentNpcId = null;
  let currentAffinity = null;
  let chatBusy = false;
  let imageBusy = false;
  let scrollFrame = 0;

  function refreshControls() {
    sendButton.disabled = chatBusy;
    input.disabled = chatBusy;
    drawButton.disabled = chatBusy || imageBusy;
    giftButton.disabled = chatBusy || !currentAffinity?.canGift;
  }

  function renderAffinity(snapshot) {
    if (!snapshot) return;
    currentAffinity = snapshot;
    affinityText.textContent = [
      `好感 ${snapshot.affinity}/100 · ${snapshot.relationship}`,
      `交谈 ${snapshot.dialogueGain}/5`,
      `赠礼 ${snapshot.gifts}/1`
    ].join('　');
    giftButton.title = snapshot.canGift ? '今日可赠送一次礼物' : '今日已赠礼';
    refreshControls();
  }

  function renderMessages(data) {
    name.textContent = data.npcName;
    title.textContent = data.npcTitle;
    const fragment = document.createDocumentFragment();
    data.messages.forEach((message) => {
      const bubble = document.createElement('p');
      bubble.className = `dialogue-line dialogue-line--${message.role}`;
      bubble.textContent = message.content;
      fragment.append(bubble);
    });
    if (data.draft) {
      const bubble = document.createElement('p');
      bubble.className = 'dialogue-line dialogue-line--assistant is-streaming';
      bubble.textContent = data.draft;
      fragment.append(bubble);
    }
    history.replaceChildren(fragment);
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      history.scrollTop = history.scrollHeight;
    });
  }

  function updateStatus(data) {
    status.textContent = data.message || '';
    chatBusy = ['opening', 'thinking', 'busy'].includes(data.state);
    refreshControls();
  }

  function updateImageStatus(data) {
    if (data.status === 'cancelled') {
      imageModal.hidden = true;
      imageBusy = false;
      refreshControls();
      return;
    }
    if (data.status === 'ready') return;
    imageModal.hidden = false;
    image.hidden = true;
    image.removeAttribute('src');
    imageBusy = data.status === 'generating' || data.status === 'busy';
    refreshControls();
    imageStatus.textContent = data.status === 'generating'
      ? '正在绘制当前场景，预计约 30 秒…'
      : (data.message || '暂时无法绘制，请稍后再次点击。');
  }

  function showImage(data) {
    if (!/^(https?:|data:image\/|blob:)/.test(data.image)) {
      updateImageStatus({ status: 'error', message: '绘图结果地址无效。' });
      return;
    }
    imageModal.hidden = false;
    imageStatus.textContent = `${data.npcName} · 当前场景`;
    image.src = data.image;
    image.alt = `${data.npcName}的生成场景`;
    image.hidden = false;
    imageBusy = false;
    refreshControls();
  }

  function closeFromGame() {
    root.game?.scene?.getScene('GameScene')?.dialogueSystem?.endDialogue();
  }

  function init() {
    if (initialized) return;
    initialized = true;
    panel = document.getElementById('ai-dialogue-panel');
    history = document.getElementById('dialogue-history');
    name = document.getElementById('dialogue-npc-name');
    title = document.getElementById('dialogue-npc-title');
    affinityText = document.getElementById('dialogue-affinity');
    status = document.getElementById('dialogue-status');
    input = document.getElementById('dialogue-input');
    sendButton = document.getElementById('dialogue-send');
    giftButton = document.getElementById('dialogue-gift');
    drawButton = document.getElementById('dialogue-draw');
    imageModal = document.getElementById('ai-image-modal');
    imageStatus = document.getElementById('ai-image-status');
    image = document.getElementById('ai-image');

    panel.addEventListener('pointerdown', (event) => event.stopPropagation());
    imageModal.addEventListener('pointerdown', (event) => event.stopPropagation());
    document.getElementById('dialogue-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      root.GameAI.send(text);
    });
    giftButton.addEventListener('click', () => root.GameGiftPanel.open(currentNpcId));
    drawButton.addEventListener('click', () => root.GameAI.generateImage());
    document.getElementById('dialogue-close').addEventListener('click', closeFromGame);
    document.getElementById('ai-image-close').addEventListener('click', () => {
      imageModal.hidden = true;
    });

    root.Game.EventBus.on('ai-dialogue-open', (data) => {
      panel.hidden = false;
      currentNpcId = data.npcId;
      name.textContent = data.npcName;
      title.textContent = data.npcTitle;
      renderAffinity(data.affinity);
    });
    root.Game.EventBus.on('ai-dialogue-render', renderMessages);
    root.Game.EventBus.on('ai-dialogue-status', updateStatus);
    root.Game.EventBus.on('affinity-changed', (data) => {
      if (data.npcId === currentNpcId) renderAffinity(data);
    });
    root.Game.EventBus.on('affinity-notice', (data) => {
      if (data.snapshot?.npcId !== currentNpcId) return;
      renderAffinity(data.snapshot);
      status.textContent = data.message || '';
    });
    root.Game.EventBus.on('game-day-changed', () => {
      if (currentNpcId) renderAffinity(root.GameAffinity.getSnapshot(currentNpcId));
    });
    root.Game.EventBus.on('ai-dialogue-close', () => {
      panel.hidden = true;
      currentNpcId = null;
      currentAffinity = null;
      status.textContent = '';
      chatBusy = false;
      refreshControls();
    });
    root.Game.EventBus.on('ai-image-status', updateImageStatus);
    root.Game.EventBus.on('ai-image-ready', showImage);
  }

  root.GameDialoguePanel = { init };
}(window));
