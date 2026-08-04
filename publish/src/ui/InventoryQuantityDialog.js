(function installInventoryQuantityDialog(root) {
  'use strict';

  function open(scene, item, onConfirm) {
    const max = Math.max(1, Math.floor(Number(item.quantity) || 1));
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
    add(root.Game.UISkin.addPanel(scene, 640, 360, 660, 330, 'card', {
      alpha: 0.99,
      depth
    }));
    add(scene.add.text(640, 250, `批量使用 · ${item.name}`, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '27px',
      color: '#fff8fa'
    }).setOrigin(0.5));
    add(scene.add.text(640, 292, `持有 ${max} 个`, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '16px',
      color: '#f4dfe5'
    }).setOrigin(0.5));
    const quantityText = add(scene.add.text(640, 350, '', {
      fontFamily: 'serif',
      fontSize: '32px',
      color: '#f0a8bb'
    }).setOrigin(0.5));

    function update(next) {
      quantity = Math.max(1, Math.min(max, Math.floor(Number(next) || 1)));
      quantityText.setText(`${quantity} / ${max}`);
      confirmButton?.setText(`使用 ×${quantity}`);
    }

    function button(x, label, action, width = 76) {
      return add(root.Game.UISkin.makeButton(scene, x, 418, label, () => {
        root.GameAudio.sfx('click');
        action();
      }, { width, height: 46, fontSize: 17, variant: 'secondary', depth }));
    }

    button(450, '-10', () => update(quantity - 10));
    button(540, '−', () => update(quantity - 1));
    button(740, '+', () => update(quantity + 1));
    button(830, '+10', () => update(quantity + 10));
    button(920, '全部', () => update(max), 92);
    add(root.Game.UISkin.makeButton(scene, 545, 490, '取消', () => {
      root.GameAudio.sfx('click');
      close();
    }, { width: 150, height: 48, fontSize: 18, variant: 'secondary', depth }));
    confirmButton = add(root.Game.UISkin.makeButton(scene, 735, 490, '', () => {
      root.GameAudio.sfx('success');
      const selected = quantity;
      close();
      onConfirm(selected);
    }, { width: 190, height: 48, fontSize: 18, depth }));
    update(1);
    return { close };
  }

  root.Game.InventoryQuantityDialog = Object.freeze({ open });
}(window));
