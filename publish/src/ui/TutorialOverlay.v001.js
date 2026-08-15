(function installTutorialOverlay(root) {
  'use strict';

  const LOGICAL_WIDTH = 1280;
  const LOGICAL_HEIGHT = 720;
  let shell;
  let layer;
  let spotlight;
  let title;
  let body;
  let progress;
  let skipButton;
  let closeButton;
  let target = null;
  let onSkip = () => {};
  let doneMode = false;
  const anchors = new Map();

  root.GameTutorialAnchors = Object.freeze({
    set(name, object) {
      if (name && object) anchors.set(name, object);
      root.GameTutorialOverlay?.position?.();
      return object;
    },
    clear(name) {
      anchors.delete(name);
      root.GameTutorialOverlay?.position?.();
    },
    get(name) {
      const object = anchors.get(name);
      if (!object || object.destroyed || object.active === false) return null;
      try {
        const bounds = object.getBounds?.();
        if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
        return {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        };
      } catch (_) {
        return null;
      }
    }
  });

  function create() {
    if (layer) return;
    shell = document.getElementById('game-shell');
    if (!shell) return;
    layer = document.createElement('section');
    layer.className = 'tutorial-layer';
    layer.setAttribute('aria-live', 'polite');
    layer.innerHTML = `
      <div class="tutorial-spotlight" aria-hidden="true"></div>
      <aside class="tutorial-card" role="dialog" aria-labelledby="tutorial-title">
        <div class="tutorial-card-kicker">山门指引 <span id="tutorial-progress"></span></div>
        <h2 id="tutorial-title"></h2>
        <p id="tutorial-body"></p>
        <div class="tutorial-card-actions">
          <button class="tutorial-skip" type="button">跳过引导</button>
          <button class="tutorial-close" type="button">知道了</button>
        </div>
      </aside>
    `;
    shell.append(layer);
    spotlight = layer.querySelector('.tutorial-spotlight');
    title = layer.querySelector('#tutorial-title');
    body = layer.querySelector('#tutorial-body');
    progress = layer.querySelector('#tutorial-progress');
    skipButton = layer.querySelector('.tutorial-skip');
    closeButton = layer.querySelector('.tutorial-close');
    skipButton.addEventListener('click', () => onSkip());
    closeButton.addEventListener('click', () => {
      if (doneMode) onSkip();
      else layer.hidden = true;
    });
    root.addEventListener('resize', position);
    layer.hidden = true;
  }

  function domRect(selector) {
    const element = document.querySelector(selector);
    if (!element || element.hidden) return null;
    const rect = element.getBoundingClientRect();
    const base = shell.getBoundingClientRect();
    return {
      left: rect.left - base.left,
      top: rect.top - base.top,
      width: rect.width,
      height: rect.height
    };
  }

  function canvasRect(value) {
    const canvas = root.game?.canvas;
    const base = shell?.getBoundingClientRect();
    const rect = canvas?.getBoundingClientRect?.();
    if (!base || !rect) return null;
    const scaleX = rect.width / LOGICAL_WIDTH;
    const scaleY = rect.height / LOGICAL_HEIGHT;
    return {
      left: rect.left - base.left + value.x * scaleX,
      top: rect.top - base.top + value.y * scaleY,
      width: value.width * scaleX,
      height: value.height * scaleY
    };
  }

  function anchorRect(value) {
    const anchor = root.GameTutorialAnchors?.get?.(value.name);
    if (anchor) return canvasRect(anchor);
    return value.fallback ? canvasRect(value.fallback) : null;
  }

  function position() {
    if (!spotlight || !target) return;
    const rect = target.type === 'dom'
      ? domRect(target.selector)
      : (target.type === 'anchor' ? anchorRect(target) : canvasRect(target));
    if (!rect) {
      spotlight.hidden = true;
      return;
    }
    const padding = Number.isFinite(Number(target.padding))
      ? Number(target.padding)
      : 6;
    spotlight.hidden = false;
    spotlight.style.left = `${rect.left - padding}px`;
    spotlight.style.top = `${rect.top - padding}px`;
    spotlight.style.width = `${rect.width + padding * 2}px`;
    spotlight.style.height = `${rect.height + padding * 2}px`;
  }

  function show(data, skip, done = false) {
    create();
    if (!layer) return;
    target = data.target || null;
    onSkip = skip || (() => {});
    doneMode = done;
    title.textContent = data.title || '';
    body.textContent = data.body || '';
    progress.textContent = data.progress || '';
    closeButton.textContent = done ? '开始自由探索' : '知道了';
    skipButton.hidden = done;
    layer.hidden = false;
    spotlight.hidden = false;
    position();
  }

  function hide() {
    if (layer) layer.hidden = true;
    target = null;
  }

  root.GameTutorialOverlay = Object.freeze({ create, show, hide, position });
}(window));
