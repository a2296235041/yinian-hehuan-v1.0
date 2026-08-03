/* release 0.1.4 */ (function installDialoguePanel(root) {
  'use strict';

  function trace(eventName, details) {
    root.GameTrace?.('DialoguePanel', eventName, details);
  }

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
  let portraitButton;
  let portraitModal;
  let portraitStatus;
  let portraitImage;
  let dialogueBlocker;
  let currentNpcId = null;
  let currentAffinity = null;
  let chatBusy = false;
  let imageBusy = false;
  let gameInputEnabled = null;
  const sceneInputStates = new Map();
  let renderedMessageCount = 0;
  let draftBubble = null;
  let renderedNpcId = null;

  /**
   * DOM 对话框位于 Phaser 画布上方，但移动端浏览器仍可能把同一次触摸
   * 交给 Phaser 的画布输入。对话期间直接停用 Phaser 输入，彻底避免点穿。
   */
  function lockGameInput() {
    const game = root.game;
    if (!game) return;
    if (game.input && gameInputEnabled === null) {
      gameInputEnabled = game.input.enabled;
      game.input.enabled = false;
    }
    const scenes = game.scene?.getScenes?.(false) || [];
    scenes.forEach((scene) => {
      if (!scene?.input || sceneInputStates.has(scene)) return;
      sceneInputStates.set(scene, scene.input.enabled);
      scene.input.enabled = false;
    });
  }

  /**
   * 恢复各场景在打开对话前的输入状态，避免把原本暂停的场景错误启用。
   */
  function unlockGameInput() {
    const game = root.game;
    sceneInputStates.forEach((enabled, scene) => {
      if (scene?.input) scene.input.enabled = enabled;
    });
    sceneInputStates.clear();
    if (game?.input && gameInputEnabled !== null) game.input.enabled = gameInputEnabled;
    gameInputEnabled = null;
  }

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
    const pinnedToBottom = history.scrollHeight - history.scrollTop - history.clientHeight < 80;
    if (data.messages.length < renderedMessageCount) {
      history.replaceChildren();
      renderedMessageCount = 0;
      draftBubble = null;
    }
    const newMessages = data.messages.slice(renderedMessageCount);
    if (draftBubble && newMessages.length === 1 && newMessages[0].role === 'assistant') {
      draftBubble.className = 'dialogue-line dialogue-line--assistant';
      draftBubble.textContent = newMessages[0].content;
      draftBubble = null;
    } else if (newMessages.length) {
      draftBubble?.remove();
      draftBubble = null;
      const fragment = document.createDocumentFragment();
      newMessages.forEach((message) => {
        const bubble = document.createElement('p');
        bubble.className = `dialogue-line dialogue-line--${message.role}`;
        bubble.textContent = message.content;
        fragment.append(bubble);
      });
      history.append(fragment);
    }
    renderedMessageCount = data.messages.length;
    if (data.draft) {
      if (!draftBubble) {
        draftBubble = document.createElement('p');
        draftBubble.className = 'dialogue-line dialogue-line--assistant is-streaming';
        history.append(draftBubble);
      }
      draftBubble.textContent = data.draft;
    } else if (draftBubble && !newMessages.length) {
      draftBubble.remove();
      draftBubble = null;
    }
    // 玩家阅读旧消息时保持当前位置；停留底部时才跟随新回复。
    if (pinnedToBottom || renderedMessageCount <= 1) history.scrollTop = history.scrollHeight;
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

  function isAllowedImageSource(source) {
    return /^(?:\.\/assets\/|https?:|data:image\/|blob:)/.test(String(source || ''));
  }

  function showPortrait(npcName, source) {
    if (!isAllowedImageSource(source)) {
      portraitStatus.textContent = '当前 NPC 暂无可查看的高清立绘。';
      portraitImage.hidden = true;
      portraitImage.removeAttribute('src');
      portraitModal.hidden = false;
      return;
    }
    portraitStatus.textContent = `${npcName} · 高清立绘`;
    portraitImage.src = source;
    portraitImage.alt = `${npcName}的高清立绘`;
    portraitImage.hidden = false;
    portraitModal.hidden = false;
  }

  function closeFromGame() {
    root.game?.scene?.getScene('GameScene')?.dialogueSystem?.endDialogue();
  }

  async function sendCurrentMessage(text) {
    trace('send-enter', {
      inputLength: String(text || '').length,
      chatBusy,
      serviceReady: typeof root.GameAI?.send === 'function'
    });
    status.textContent = '消息已发送，等待回应…';
    if (typeof root.GameAI?.send !== 'function') {
      throw new Error('NPC 对话服务尚未就绪');
    }
    const result = await root.GameAI.send(text);
    trace('send-exit', {
      chatBusy,
      ok: result?.ok !== false,
      reason: result?.reason || ''
    });
    return result;
  }

  function handleSendError(error) {
    trace('send-error', {
      code: error?.code || '',
      message: error?.message || 'unknown'
    });
    console.error('NPC 消息发送失败:', error.code || '', error.message, error.stack);
    root.Game.EventBus.emit('ai-dialogue-status', {
      state: 'error',
      message: error.message || '消息发送失败，请再次点击发送。'
    });
  }

  function bindDirectInput() {
    let pending = false;
    let composing = false;
    async function submit(event, source) {
      event?.preventDefault();
      event?.stopPropagation();
      trace('direct-submit', {
        source,
        eventType: event?.type || 'unknown',
        pending,
        chatBusy,
        buttonDisabled: Boolean(sendButton.disabled)
      });
      if (pending || chatBusy) {
        trace('direct-blocked', { reason: pending ? 'pending' : 'chatBusy', source });
        return;
      }
      const text = String(input.value || '').trim();
      if (!text) {
        trace('direct-blocked', { reason: 'empty', source });
        return;
      }
      pending = true;
      input.value = '';
      try {
        const result = await sendCurrentMessage(text);
        if (result?.ok === false && !input.value) input.value = text;
      } catch (error) {
        if (!input.value) input.value = text;
        handleSendError(error);
      } finally {
        pending = false;
      }
    }
    sendButton.addEventListener('click', (event) => void submit(event, 'click'));
    input.addEventListener('keydown', (event) => {
      const enter = event.key === 'Enter' || event.code === 'Enter' || event.keyCode === 13;
      if (!enter) return;
      if (event.isComposing || composing) {
        trace('direct-blocked', { reason: 'composing', source: 'keydown' });
        return;
      }
      void submit(event, 'keydown');
    });
    input.addEventListener('compositionstart', () => {
      composing = true;
    });
    input.addEventListener('compositionend', () => {
      composing = false;
    });
    trace('binder-selected', { binder: 'direct-click-keydown' });
  }

  function traceCapturedEvent(event) {
    const isButton = event.target === sendButton;
    const isEnter = event.target === input
      && (event.key === 'Enter' || event.code === 'Enter' || event.keyCode === 13);
    if (!isButton && !isEnter) return;
    trace('dom-event-capture', {
      eventType: event.type,
      target: isButton ? 'send-button' : 'dialogue-input',
      pointerType: event.pointerType || '',
      buttonDisabled: Boolean(sendButton.disabled),
      inputDisabled: Boolean(input.disabled),
      chatBusy
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    panel = document.getElementById('ai-dialogue-panel');
    dialogueBlocker = document.getElementById('dialogue-blocker');
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
    portraitButton = document.getElementById('dialogue-portrait');
    portraitModal = document.getElementById('portrait-modal');
    portraitStatus = document.getElementById('portrait-status');
    portraitImage = document.getElementById('portrait-image');
    trace('init', {
      version: root.GameRelease?.version || 'dev',
      inputFound: Boolean(input),
      buttonFound: Boolean(sendButton),
      panelFound: Boolean(panel)
    });

    panel.addEventListener('pointerdown', (event) => event.stopPropagation());
    panel.addEventListener('pointerdown', traceCapturedEvent, true);
    panel.addEventListener('pointerup', traceCapturedEvent, true);
    panel.addEventListener('touchend', traceCapturedEvent, true);
    panel.addEventListener('click', traceCapturedEvent, true);
    panel.addEventListener('keydown', traceCapturedEvent, true);
    dialogueBlocker.addEventListener('pointerdown', (event) => event.stopPropagation());
    imageModal.addEventListener('pointerdown', (event) => event.stopPropagation());
    portraitModal.addEventListener('pointerdown', (event) => event.stopPropagation());
    bindDirectInput();
    giftButton.addEventListener('click', () => root.GameGiftPanel.open(currentNpcId));
    drawButton.addEventListener('click', () => root.GameAI.generateImage());
    document.getElementById('dialogue-close').addEventListener('click', closeFromGame);
    document.getElementById('ai-image-close').addEventListener('click', () => {
      imageModal.hidden = true;
    });
    document.getElementById('portrait-close').addEventListener('click', () => {
      portraitModal.hidden = true;
    });
    portraitButton.addEventListener('click', () => {
      const source = portraitButton.dataset.source || '';
      showPortrait(name.textContent || 'NPC', source);
    });

    root.Game.EventBus.on('ai-dialogue-open', (data) => {
      trace('dialogue-open', {
        npcId: data.npcId || '',
        buttonDisabled: Boolean(sendButton.disabled),
        chatBusy
      });
      lockGameInput();
      panel.hidden = false;
      dialogueBlocker.hidden = false;
      portraitModal.hidden = true;
      currentNpcId = data.npcId;
      if (renderedNpcId !== data.npcId) {
        history.replaceChildren(); renderedMessageCount = 0; draftBubble = null;
        renderedNpcId = data.npcId;
      }
      name.textContent = data.npcName;
      title.textContent = data.npcTitle;
      const portraitPath = root.Game.NpcCardRenderer?.portraitPath?.(data.npcId) || '';
      portraitButton.dataset.source = portraitPath;
      portraitButton.hidden = !isAllowedImageSource(portraitPath);
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
      unlockGameInput();
      panel.hidden = true;
      dialogueBlocker.hidden = true;
      portraitModal.hidden = true;
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
