(function installShopGridView(root) {
  'use strict';

  function add(scene, object) {
    scene.productObjects.push(object);
    return object;
  }

  function addEmpty(scene, x, y) {
    add(scene, root.Game.CommerceDecor.addSlot(scene, x, y, 520, 202, false));
    add(scene, scene.add.text(x, y - 7, '◇', {
      fontFamily: 'serif', fontSize: '25px', color: '#77676d'
    }).setOrigin(0.5));
    add(scene, scene.add.text(x, y + 24, '货架空置', {
      fontFamily: '"Noto Serif SC", serif', fontSize: '12px', color: '#786b70'
    }).setOrigin(0.5));
  }

  function addProduct(scene, offer, x, y) {
    const item = offer.item;
    add(scene, root.Game.CommerceDecor.addSlot(scene, x, y, 520, 202, true));
    root.Game.ItemIconAssets.create(
      scene, item, x - 208, y - 38, (object) => add(scene, object)
    );
    add(scene, scene.add.text(x - 166, y - 82, item.name, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '21px',
      color: '#f0a8bb',
      fixedWidth: 270
    }));
    add(scene, scene.add.text(x + 225, y - 78,
      `持有 ${root.GameInventory.getQuantity(offer.itemId)}`, {
        fontFamily: 'serif', fontSize: '13px', color: '#d8cbd0',
        fixedWidth: 120, align: 'right'
      }).setOrigin(1, 0));
    add(scene, scene.add.text(
      x - 166, y - 46, `${item.rarity} · ${root.GameShop.effectLabel(item)}`, {
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '13px',
        color: '#e5bd78',
        fixedWidth: 370
      }
    ));
    add(scene, scene.add.text(
      x - 166, y - 14, root.Game.TextBoxUtils.fit(item.description, 30, 2), {
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '13px',
        color: '#d8cbd0',
        lineSpacing: 4,
        fixedWidth: 380
      }
    ));
    add(scene, scene.add.text(x - 166, y + 70, `${offer.price} 灵石 / 个`, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '14px',
      color: '#fff8fa'
    }).setOrigin(0, 0.5));
    const button = root.Game.UISkin.makeButton(
      scene, x + 135, y + 68, '选择数量',
      (target) => scene.openPurchaseDialog(offer, target),
      { width: 180, height: 42, fontSize: 15 }
    );
    add(scene, button);
  }

  function render(scene, offers) {
    scene.productObjects.forEach((object) => object.destroy());
    scene.productObjects = [];
    for (let index = 0; index < 4; index += 1) {
      const x = index % 2 === 0 ? 350 : 930;
      const y = index < 2 ? 245 : 475;
      if (offers[index]) addProduct(scene, offers[index], x, y);
      else addEmpty(scene, x, y);
    }
  }

  root.Game.ShopGridView = Object.freeze({ render });
}(window));
