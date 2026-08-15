(function installTournamentPortraitModal(root) {
  'use strict';

  let modalState = null;

  function node(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  }

  function ensureModal() {
    if (modalState) return modalState;
    const modal = node('section', 'tournament-portrait-modal');
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    const panel = node('div', 'tournament-portrait-panel');
    const heading = node('div', 'tournament-portrait-heading');
    const title = node('strong', '', '高清立绘');
    const close = node('button', 'tournament-portrait-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', '关闭高清立绘');
    close.title = '关闭';
    const image = node('img', 'tournament-portrait-image');
    image.hidden = true;
    heading.append(title, close);
    panel.append(heading, image);
    modal.append(panel);
    modal.addEventListener('pointerdown', (event) => {
      if (event.target === modal) modal.hidden = true;
      event.stopPropagation();
    });
    close.addEventListener('click', () => {
      modal.hidden = true;
    });
    document.body.append(modal);
    modalState = { modal, title, image };
    return modalState;
  }

  function open(profile, source) {
    if (!source) return;
    const view = ensureModal();
    view.title.textContent = `${profile.name} · 高清立绘`;
    view.image.src = root.Game?.AssetUrl?.withVersion?.(source) || source;
    view.image.alt = `${profile.name}的高清立绘`;
    view.image.hidden = false;
    view.modal.hidden = false;
  }

  root.GameTournamentPortraitModal = Object.freeze({ open });
}(window));
