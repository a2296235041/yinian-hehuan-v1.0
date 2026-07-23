(function installGiftPanel(root) {
  'use strict';

  let initialized = false;
  let modal;
  let list;
  let empty;
  let currentNpcId = null;

  function close() {
    modal.hidden = true;
    currentNpcId = null;
  }

  function render() {
    const items = root.GameInventory.getGiftableItems();
    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gift-item';
      button.innerHTML = [
        `<strong>${item.name}<span>×${item.quantity}</span></strong>`,
        `<small>${item.rarity} · 好感 +${item.gift_affinity}</small>`,
        `<em>${item.description}</em>`
      ].join('');
      button.addEventListener('click', async () => {
        if (!currentNpcId || root.GameGift.isBusy()) return;
        button.disabled = true;
        const npcId = currentNpcId;
        close();
        await root.GameAI.giveGift(item.id, npcId);
      });
      fragment.append(button);
    });
    list.replaceChildren(fragment);
    empty.hidden = items.length > 0;
  }

  function open(npcId) {
    currentNpcId = npcId;
    render();
    modal.hidden = false;
  }

  function init() {
    if (initialized) return;
    initialized = true;
    modal = document.getElementById('gift-modal');
    list = document.getElementById('gift-list');
    empty = document.getElementById('gift-empty');
    document.getElementById('gift-close').addEventListener('click', close);
    modal.addEventListener('pointerdown', (event) => {
      if (event.target === modal) close();
      event.stopPropagation();
    });
    root.Game.EventBus.on('inventory-changed', () => {
      if (!modal.hidden) render();
    });
    root.Game.EventBus.on('ai-dialogue-close', close);
  }

  root.GameGiftPanel = { init, open, close };
}(window));
