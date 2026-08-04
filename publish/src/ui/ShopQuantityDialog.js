(function installShopQuantityDialog(root) {
  'use strict';

  function open(scene, offer, onConfirm) {
    const owned = root.GameInventory.getQuantity(offer.itemId);
    const affordable = Math.floor(root.GameInventory.getSpiritStones() / offer.price);
    const max = Math.max(0, Math.min(99, 9999 - owned, affordable));
    if (!max) return null;
    const objects = [];
    const depth = 900;
    const balance = root.GameInventory.getSpiritStones();
    let quantity = 1;
    let closed = false;
    let confirmButton;
    let quantityText;
    let settlementText;
    const decreaseButtons = [];
    const increaseButtons = [];

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
    add(scene.add.rectangle(640, 360, 700, 400, 0xffffff, 0.001).setInteractive());
    add(root.Game.CommerceDecor.addDialogFrame(scene, 640, 360, 700, 400));
    add(scene.add.text(510, 202, '◇', {
      fontFamily: 'serif', fontSize: '17px', color: '#e5bd78'
    }).setOrigin(0.5));
    add(scene.add.text(770, 202, '◇', {
      fontFamily: 'serif', fontSize: '17px', color: '#e5bd78'
    }).setOrigin(0.5));
    add(scene.add.text(640, 202, '批量购买', {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '28px',
      color: '#fff8fa'
    }).setOrigin(0.5));
    root.Game.CommerceDecor.addSeal(
      scene, 382, 268, offer.item.name[0], offer.item.rarity
    ).forEach(add);
    add(scene.add.text(425, 246, offer.item.name, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '20px',
      color: '#f0a8bb',
      fixedWidth: 300
    }));
    add(scene.add.text(
      425, 276, `${offer.item.rarity} · ${root.GameShop.effectLabel(offer.item)}`, {
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '13px',
        color: '#d8cbd0',
        fixedWidth: 330
      }
    ));
    add(scene.add.text(900, 246, `单价 ${root.Game.CommerceDecor.formatNumber(offer.price)} 灵石`, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '15px',
      color: '#fff8fa',
      fixedWidth: 210,
      align: 'right'
    }).setOrigin(1, 0));
    add(scene.add.text(900, 276, `可购上限 ${max} · 当前持有 ${owned}`, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '13px',
      color: '#e5bd78',
      fixedWidth: 250,
      align: 'right'
    }).setOrigin(1, 0));
    add(scene.add.text(640, 326, '购买数量', {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '13px',
      color: '#bdaab1'
    }).setOrigin(0.5));
    quantityText = add(scene.add.text(640, 360, '', {
      fontFamily: 'serif',
      fontSize: '34px',
      color: '#f0a8bb'
    }).setOrigin(0.5));
    settlementText = add(scene.add.text(640, 397, '', {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '14px',
      color: '#fff8fa',
      fixedWidth: 580,
      align: 'center'
    }).setOrigin(0.5));

    function update(next) {
      quantity = Math.max(1, Math.min(max, Math.floor(Number(next) || 1)));
      const total = offer.price * quantity;
      quantityText.setText(`${quantity} 个`);
      settlementText.setText(
        `合计 ${root.Game.CommerceDecor.formatNumber(total)} 灵石　·　余额 `
        + `${root.Game.CommerceDecor.formatNumber(balance)} → `
        + `${root.Game.CommerceDecor.formatNumber(balance - total)}`
      );
      confirmButton?.setText(`购买 ×${quantity}`);
      decreaseButtons.forEach((button) => {
        button.setAlpha(quantity <= 1 ? 0.42 : 1);
        if (quantity <= 1) button.disableInteractive();
        else button.setInteractive({ useHandCursor: true });
      });
      increaseButtons.forEach((button) => {
        button.setAlpha(quantity >= max ? 0.42 : 1);
        if (quantity >= max) button.disableInteractive();
        else button.setInteractive({ useHandCursor: true });
      });
    }

    function stepButton(x, label, action, group, width = 76) {
      const button = add(root.Game.UISkin.makeButton(scene, x, 444, label, () => {
        root.GameAudio.sfx('click');
        action();
      }, { width, height: 42, fontSize: 16, variant: 'secondary', depth }));
      group.push(button);
      return button;
    }

    stepButton(430, '-10', () => update(quantity - 10), decreaseButtons);
    stepButton(520, '−', () => update(quantity - 1), decreaseButtons);
    stepButton(670, '+', () => update(quantity + 1), increaseButtons);
    stepButton(760, '+10', () => update(quantity + 10), increaseButtons);
    stepButton(860, '最多', () => update(max), increaseButtons, 92);
    add(root.Game.UISkin.makeButton(scene, 535, 515, '取消', () => {
      root.GameAudio.sfx('click');
      close();
    }, { width: 170, height: 48, fontSize: 18, variant: 'secondary', depth }));
    confirmButton = add(root.Game.UISkin.makeButton(scene, 745, 515, '', () => {
      const selected = quantity;
      close();
      onConfirm(selected);
    }, { width: 220, height: 48, fontSize: 18, depth }));
    update(1);
    return { close, max };
  }

  root.Game.ShopQuantityDialog = Object.freeze({ open });
}(window));
