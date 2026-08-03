/* release 0.1.4 */ (function installExplorationPanel(root) {
  'use strict';

  function trace(eventName, details) {
    root.GameTrace?.('ExplorationPanel', eventName, details);
  }

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

  function bindIntentInput() {
    let composing = false;
    let pending = false;

    async function sendIntent(event, source) {
      event?.preventDefault();
      event?.stopPropagation();
      const text = String(input.value || '').trim();
      trace('intent-submit', {
        source,
        inputLength: text.length,
        pending,
        buttonDisabled: Boolean(submit.disabled)
      });
      if (pending || submit.disabled || !text) {
        trace('intent-blocked', {
          source,
          reason: pending ? 'pending' : (submit.disabled ? 'disabled' : 'empty')
        });
        return;
      }
      pending = true;
      input.value = '';
      try {
        await callbacks.onSubmit?.(text);
        trace('intent-complete', { source });
      } catch (error) {
        if (!input.value) input.value = text;
        status.textContent = error?.message || '本次探索未能发送，请再次尝试。';
        trace('intent-error', {
          source,
          code: error?.code || '',
          message: error?.message || 'unknown'
        });
      } finally {
        pending = false;
      }
    }

    submit.addEventListener('click', (event) => void sendIntent(event, 'click'));
    input.addEventListener('keydown', (event) => {
      const enter = event.key === 'Enter' || event.code === 'Enter' || event.keyCode === 13;
      if (!enter) return;
      if (event.isComposing || composing) {
        trace('intent-blocked', { source: 'keydown', reason: 'composing' });
        return;
      }
      void sendIntent(event, 'keydown');
    });
    input.addEventListener('compositionstart', () => { composing = true; });
    input.addEventListener('compositionend', () => { composing = false; });
    trace('binder-selected', { binder: 'direct-click-keydown' });
  }

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
    bindIntentInput();
    quick.addEventListener('click', () => callbacks.onQuick?.());
    document.getElementById('exploration-back').addEventListener('click', () => callbacks.onBack?.());
    panel.addEventListener('pointerdown', (event) => event.stopPropagation());
    trace('init', {
      version: root.GameRelease?.version || 'dev',
      inputFound: Boolean(input),
      submitFound: Boolean(submit),
      quickFound: Boolean(quick)
    });
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
  }

  function setMode(hasEncounter) {
    init();
    input.placeholder = hasEncounter ? '继续描述行动，或与遇到的人交谈' : '输入你想如何探索';
    submit.textContent = hasEncounter ? '发送' : '按意图探索';
    quick.textContent = hasEncounter ? '继续探索' : '一键探索';
  }

  root.GameExplorationPanel = { open, close, hide, show, render, setBusy, setMode };
}(window));
