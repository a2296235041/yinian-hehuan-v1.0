(function installInventoryGridView(root) {
  'use strict';

  const labels = { cultivation: '丹', attribute: '诀', gift: '礼', material: '材' };

  function typeLabel(type) {
    return labels[type] || '物';
  }

  function add(scene, object) {
    scene.entryObjects.push(object);
    return object;
  }

  function addEmpty(scene, x, y) {
    add(scene, root.Game.CommerceDecor.addSlot(scene, x, y, 500, 92, false));
    add(scene, scene.add.text(x, y - 5, '◇', {
      fontFamily: 'serif', fontSize: '20px', color: '#77676d'
    }).setOrigin(0.5));
    add(scene, scene.add.text(x, y + 20, '空置', {
      fontFamily: '"Noto Serif SC", serif', fontSize: '11px', color: '#786b70'
    }).setOrigin(0.5));
  }

  function addItem(scene, item, x, y) {
    add(scene, root.Game.CommerceDecor.addSlot(scene, x, y, 500, 92, true));
    root.Game.ItemIconAssets.create(scene, item, x - 210, y, (object) => add(scene, object));
    add(scene, scene.add.text(x - 170, y - 30, item.name, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '19px',
      color: '#f0a8bb',
      fixedWidth: 280
    }));
    add(scene, scene.add.text(x + 222, y - 29, `×${item.quantity}`, {
      fontFamily: 'serif',
      fontSize: '18px',
      color: '#fff8fa',
      fixedWidth: 90,
      align: 'right'
    }).setOrigin(1, 0));
    const type = ['cultivation', 'attribute'].includes(item.type) ? '可使用' : '赠礼';
    add(scene, scene.add.text(x - 170, y - 2, `${item.rarity} · ${type}`, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '12px',
      color: '#e5bd78'
    }));
    add(scene, scene.add.text(
      x - 170, y + 18, root.Game.TextBoxUtils.fit(item.description, 26, 2), {
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '12px',
        color: '#d8cbd0',
        lineSpacing: 2,
        fixedWidth: 310
      }
    ));
    if (['cultivation', 'attribute'].includes(item.type)) {
      add(scene, root.Game.UISkin.makeButton(
        scene, x + 190, y + 20, '使用', () => scene.openUseDialog(item),
        { width: 82, height: 40, fontSize: 14 }
      ));
    } else {
      add(scene, scene.add.text(x + 190, y + 20, '赠礼素材', {
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '12px',
        color: '#bdaab1',
        fixedWidth: 88,
        align: 'center'
      }).setOrigin(0.5));
    }
  }

  function render(scene) {
    scene.spiritStoneText?.setText(
      root.Game.CommerceDecor.formatNumber(root.GameInventory.getSpiritStones())
    );
    scene.entryObjects.forEach((object) => object.destroy());
    scene.entryObjects = [];
    const items = root.GameInventory.getSnapshot().items.filter((item) => item.quantity > 0);
    const pageCount = Math.max(1, Math.ceil(items.length / 8));
    scene.page = Math.min(scene.page, pageCount - 1);
    scene.pageText?.setText(`第 ${scene.page + 1} / ${pageCount} 页`);
    const pageItems = items.slice(scene.page * 8, scene.page * 8 + 8);
    for (let index = 0; index < 8; index += 1) {
      const x = index % 2 === 0 ? 360 : 920;
      const y = 190 + Math.floor(index / 2) * 104;
      if (pageItems[index]) addItem(scene, pageItems[index], x, y);
      else addEmpty(scene, x, y);
    }
  }

  root.Game.InventoryGridView = Object.freeze({ typeLabel, render });
}(window));
