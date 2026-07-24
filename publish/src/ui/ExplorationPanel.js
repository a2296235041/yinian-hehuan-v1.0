(function installExplorationPanel(root) {
  'use strict';

  let initialized = false;
  let panel;
  let history;
  let title;
  let status;
  let input;
  let submit;
  let quick;
  let callbacks = {};
  let session = null;
  let draftBubble = null;

  function init() {
    if (initialized) return;
    initialized = true;
    panel = document.getElementById('exploration-dialogue-panel');
    history = document.getElementById('exploration-history');
    title = document.getElementById('exploration-panel-title');
    status = document.getElementById('exploration-panel-status');
    input = document.getElementById('exploration-input');
    submit = document.getElementById('exploration-submit');
    quick = document.getElementById('exploration-quick');
    document.getElementById('exploration-command-panel').addEventListener('submit', (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      callbacks.onSubmit?.(text);
    });
    quick.addEventListener('click', () => callbacks.onQuick?.());
    document.getElementById('exploration-back').addEventListener('click', () => callbacks.onBack?.());
    panel.addEventListener('pointerdown', (event) => event.stopPropagation());
  }

  function render(current = session, draft = '') {
    init();
    session = current;
    const pinned = history.scrollHeight - history.scrollTop - history.clientHeight < 70;
    history.replaceChildren();
    (session?.messages || []).forEach((message) => {
      const bubble = document.createElement('p');
      bubble.className = `exploration-line exploration-line--${message.role}`;
      bubble.textContent = message.content;
      history.append(bubble);
    });
    draftBubble = null;
    if (draft) {
      draftBubble = document.createElement('p');
      draftBubble.className = 'exploration-line exploration-line--assistant is-streaming';
      draftBubble.textContent = draft;
      history.append(draftBubble);
    }
    if (pinned || (session?.messages.length || 0) < 3) history.scrollTop = history.scrollHeight;
  }

  function open(region, current, nextCallbacks) {
    init();
    session = current;
    callbacks = nextCallbacks || {};
    title.textContent = `${region.name} · 探索见闻`;
    panel.hidden = false;
    status.textContent = '';
    render();
    setMode(false);
  }

  function close() {
    init();
    panel.hidden = true;
    callbacks = {};
    session = null;
    draftBubble = null;
    history.replaceChildren();
    status.textContent = '';
  }

  function hide() {
    init();
    panel.hidden = true;
  }

  function show() {
    init();
    if (session) panel.hidden = false;
  }

  function setBusy(busy, message = null) {
    init();
    input.disabled = busy;
    submit.disabled = busy;
    quick.disabled = busy;
    if (message !== null) status.textContent = message;
    if (!busy) input.focus();
  }

  function setMode(hasEncounter) {
    init();
    input.placeholder = hasEncounter ? '继续描述行动，或与遇到的人交谈' : '输入你想如何探索';
    submit.textContent = hasEncounter ? '发送' : '按意图探索';
    quick.textContent = hasEncounter ? '继续探索' : '一键探索';
  }

  root.GameExplorationPanel = { open, close, hide, show, render, setBusy, setMode };
}(window));
