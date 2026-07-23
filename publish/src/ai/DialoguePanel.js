(function installDialoguePanel(root) {
  'use strict';

  let initialized = false;
  let panel;
  let history;
  let name;
  let title;
  let status;
  let input;
  let sendButton;
  let drawButton;
  let imageModal;
  let imageStatus;
  let image;

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
    history.scrollTop = history.scrollHeight;
  }

  function updateStatus(data) {
    status.textContent = data.message || '';
    const busy = data.state === 'thinking' || data.state === 'busy';
    sendButton.disabled = busy;
    input.disabled = busy;
  }

  function updateImageStatus(data) {
    if (data.status === 'cancelled') {
      imageModal.hidden = true;
      drawButton.disabled = false;
      return;
    }
    if (data.status === 'ready') return;
    imageModal.hidden = false;
    image.hidden = true;
    image.removeAttribute('src');
    drawButton.disabled = data.status === 'generating' || data.status === 'busy';
    if (data.status === 'generating') {
      imageStatus.textContent = '正在绘制当前场景，预计约 30 秒…';
    } else {
      imageStatus.textContent = data.message || '暂时无法绘制，请稍后再次点击。';
    }
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
    drawButton.disabled = false;
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
    status = document.getElementById('dialogue-status');
    input = document.getElementById('dialogue-input');
    sendButton = document.getElementById('dialogue-send');
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
    drawButton.addEventListener('click', () => root.GameAI.generateImage());
    document.getElementById('dialogue-close').addEventListener('click', closeFromGame);
    document.getElementById('ai-image-close').addEventListener('click', () => {
      imageModal.hidden = true;
    });

    root.Game.EventBus.on('ai-dialogue-open', (data) => {
      panel.hidden = false;
      name.textContent = data.npcName;
      title.textContent = data.npcTitle;
    });
    root.Game.EventBus.on('ai-dialogue-render', renderMessages);
    root.Game.EventBus.on('ai-dialogue-status', updateStatus);
    root.Game.EventBus.on('ai-dialogue-close', () => {
      panel.hidden = true;
      status.textContent = '';
      input.disabled = false;
      sendButton.disabled = false;
    });
    root.Game.EventBus.on('ai-image-status', updateImageStatus);
    root.Game.EventBus.on('ai-image-ready', showImage);
  }

  root.GameDialoguePanel = { init };
}(window));
