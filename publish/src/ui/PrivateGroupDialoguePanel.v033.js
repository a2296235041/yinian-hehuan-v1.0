(function installPrivateGroupDialoguePanel(root) {
  'use strict';

  let initialized = false;
  let panel;
  let blocker;
  let participantsNode;
  let history;
  let status;
  let input;
  let sendButton;
  let companions = [];
  let busy = false;
  let gameInputEnabled = null;
  const sceneInputStates = new Map();

  function node(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  }

  function lockGameInput() {
    const game = root.game;
    if (!game) return;
    if (game.input && gameInputEnabled === null) {
      gameInputEnabled = game.input.enabled;
      game.input.enabled = false;
    }
    (game.scene?.getScenes?.(false) || []).forEach((scene) => {
      if (!scene?.input || sceneInputStates.has(scene)) return;
      sceneInputStates.set(scene, scene.input.enabled);
      scene.input.enabled = false;
    });
  }

  function unlockGameInput() {
    sceneInputStates.forEach((enabled, scene) => {
      if (scene?.input) scene.input.enabled = enabled;
    });
    sceneInputStates.clear();
    if (root.game?.input && gameInputEnabled !== null) root.game.input.enabled = gameInputEnabled;
    gameInputEnabled = null;
  }

  function refreshControls() {
    input.disabled = busy;
    sendButton.disabled = busy;
    sendButton.textContent = busy ? '回应中…' : '发送';
  }

  function avatar(profile) {
    const frame = node('span', 'private-group-avatar');
    const source = root.Game?.NpcCardRenderer?.portraitPath?.(profile.id) || '';
    if (/^\.\/assets\//.test(source)) {
      const image = node('img');
      image.src = source;
      image.alt = '';
      frame.append(image);
    } else {
      frame.append(node('strong', '', profile.name.slice(0, 1)));
    }
    return frame;
  }

  function renderParticipants() {
    participantsNode.replaceChildren();
    companions.forEach((profile) => {
      const affinity = root.GameAffinity.getSnapshot(profile.id);
      const item = node('div', 'private-group-participant');
      const copy = node('span', '');
      copy.append(
        node('strong', '', profile.name),
        node('small', '', `好感 ${affinity.affinity} · ${affinity.relationship}`)
      );
      item.append(avatar(profile), copy);
      participantsNode.append(item);
    });
  }

  function renderAssistant(content) {
    root.GamePrivateGroupPrompts.parse(content, companions).forEach((entry) => {
      if (entry.kind === 'scene') {
        history.append(node('p', 'private-group-scene-line', entry.content));
        return;
      }
      const index = companions.findIndex((npc) => npc.id === entry.speakerId);
      const item = node(
        'article',
        `private-group-response is-${entry.type} speaker-${Math.max(0, index)}`
      );
      item.append(
        node('strong', '', `${entry.speakerName} · ${entry.type === 'action' ? '行动' : '回应'}`),
        node('p', '', entry.content)
      );
      history.append(item);
    });
  }

  function renderMessages(data) {
    history.replaceChildren();
    data.messages.forEach((message) => {
      if (message.role === 'user') {
        history.append(node('p', 'private-group-user-line', message.content));
      } else {
        renderAssistant(message.content);
      }
    });
    history.scrollTop = history.scrollHeight;
  }

  function updateStatus(data) {
    status.textContent = data.message || '';
    busy = ['thinking', 'busy'].includes(data.state);
    refreshControls();
  }

  async function submit(event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (busy) return;
    const value = String(input.value || '').trim();
    if (!value) return;
    input.value = '';
    const result = await root.GamePrivateGroupDialogue.send(value);
    if (result?.ok === false && result.reason !== 'stale' && !input.value) input.value = value;
  }

  function init() {
    if (initialized) return;
    initialized = true;
    panel = document.getElementById('private-group-panel');
    blocker = document.getElementById('private-group-blocker');
    participantsNode = document.getElementById('private-group-participants');
    history = document.getElementById('private-group-history');
    status = document.getElementById('private-group-status');
    input = document.getElementById('private-group-input');
    sendButton = document.getElementById('private-group-send');
    panel.addEventListener('pointerdown', (event) => event.stopPropagation());
    blocker.addEventListener('pointerdown', (event) => event.stopPropagation());
    sendButton.addEventListener('click', submit);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.isComposing) void submit(event);
    });
    document.getElementById('private-group-close').addEventListener('click', () => {
      root.GamePrivateGroupDialogue.close();
    });
    root.Game.EventBus.on('private-group-open', (data) => {
      companions = data.companions;
      document.getElementById('private-group-location').textContent = data.locationName;
      lockGameInput();
      panel.hidden = false;
      blocker.hidden = false;
      renderParticipants();
    });
    root.Game.EventBus.on('private-group-render', renderMessages);
    root.Game.EventBus.on('private-group-status', updateStatus);
    root.Game.EventBus.on('affinity-changed', (data) => {
      if (!panel.hidden && companions.some((npc) => npc.id === data.npcId)) renderParticipants();
    });
    root.Game.EventBus.on('private-group-close', () => {
      unlockGameInput();
      panel.hidden = true;
      blocker.hidden = true;
      companions = [];
      busy = false;
      status.textContent = '';
      refreshControls();
    });
  }

  root.GamePrivateGroupDialoguePanel = Object.freeze({ init });
}(window));
