(function installShopQuantityDialog(root) {
  'use strict';

  function open(scene, offer, onConfirm) {
    const owned = root.GameInventory.getQuantity(offer.itemId);
    const affordable = Math.floor(root.GameInventory.getSpiritStones() / offer.price);
    const max = Math.max(0, Math.min(99, 9999 - owned, affordable));
    if (!max) return null;
    const objects = [];
    const depth = 900;
    let quantity = 1;
    let closed = false;
    let confirmButton;

    function add(object) {
      objects.push(object);
      return object.setDepth(depth);
    }

    function close() {
      if (closed) return;
      closed = true;
      objects.forEach((object) => object.destroy());
    }

    const blocker = add(scene.add.rectangle(640, 360, 1280, 720, 0x050807, 0.76)
      .setInteractive());
    blocker.on('pointerdown', close);
    add(root.Game.UISkin.addPanel(scene, 640, 360, 660, 350, 'card', {
      alpha: 0.99,
      depth
    }));
    add(scene.add.text(640, 235, `批量购买 · ${offer.item.name}`, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '27px',
      color: '#fff8fa'
    }).setOrigin(0.5));
    add(scene.add.text(640, 282, `单价 ${offer.price} 灵石 · 最多购买 ${max} 个`, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '16px',
      color: '#f4dfe5'
    }).setOrigin(0.5));
    const quantityText = add(scene.add.text(640, 345, '', {
      fontFamily: 'serif',
      fontSize: '30px',
      color: '#f0a8bb'
    }).setOrigin(0.5));

    function update(next) {
      quantity = Math.max(1, Math.min(max, Math.floor(Number(next) || 1)));
      quantityText.setText(`${quantity} 个 · 共 ${offer.price * quantity} 灵石`);
      confirmButton?.setText(`购买 ×${quantity}`);
    }

    function stepButton(x, label, action, width = 76) {
      return add(root.Game.UISkin.makeButton(scene, x, 415, label, () => {
        root.GameAudio.sfx('click');
        action();
      }, { width, height: 46, fontSize: 17, variant: 'secondary', depth }));
    }

    stepButton(450, '-10', () => update(quantity - 10));
    stepButton(540, '−', () => update(quantity - 1));
    stepButton(740, '+', () => update(quantity + 1));
    stepButton(830, '+10', () => update(quantity + 10));
    stepButton(920, '最多', () => update(max), 92);
    add(root.Game.UISkin.makeButton(scene, 545, 495, '取消', () => {
      root.GameAudio.sfx('click');
      close();
    }, { width: 150, height: 48, fontSize: 18, variant: 'secondary', depth }));
    confirmButton = add(root.Game.UISkin.makeButton(scene, 735, 495, '', () => {
      const selected = quantity;
      close();
      onConfirm(selected);
    }, { width: 190, height: 48, fontSize: 18, depth }));
    update(1);
    return { close, max };
  }

  root.Game.ShopQuantityDialog = Object.freeze({ open });
}(window));
