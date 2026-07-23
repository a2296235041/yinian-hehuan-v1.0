(function installShopSystem(root) {
  'use strict';

  const attributeNames = {
    strength: '力量',
    constitution: '根骨',
    agility: '身法',
    intelligence: '神识',
    wisdom: '悟性',
    luck: '气运'
  };
  let queue = Promise.resolve();

  function enqueue(action) {
    const task = queue.then(action, action);
    queue = task.then(() => undefined, () => undefined);
    return task;
  }

  function getShop(buildingId) {
    const shop = root.Game.Data.shops?.[buildingId];
    if (!shop) return null;
    return {
      ...shop,
      buildingId,
      offers: shop.offers.map((offer) => ({
        ...offer,
        item: root.GameInventory.getItem(offer.itemId)
      })).filter((offer) => offer.item)
    };
  }

  function effectLabel(item) {
    if (item.type === 'cultivation') return `使用后修为 +${item.cultivation_gain}`;
    if (item.type === 'attribute') {
      return `使用后${attributeNames[item.attribute] || item.attribute} +${item.attribute_gain}`;
    }
    return `赠礼好感 +${item.gift_affinity || 0}`;
  }

  function purchase(buildingId, itemId) {
    return enqueue(async () => {
      await root.GameInventory.ready();
      const shop = getShop(buildingId);
      const offer = shop?.offers.find((entry) => entry.itemId === itemId);
      if (!offer) return { changed: false, reason: 'not_sold' };
      const spent = await root.GameInventory.removeSpiritStones(offer.price, 'shop');
      if (!spent.changed) return { changed: false, reason: spent.reason, offer };
      const added = await root.GameInventory.add(itemId, 1, 'shop');
      if (!added.changed) {
        await root.GameInventory.addSpiritStones(offer.price, 'shop_refund');
        return { changed: false, reason: 'delivery_failed', offer };
      }
      return {
        changed: true,
        offer,
        item: added.item,
        balance: root.GameInventory.getSpiritStones()
      };
    });
  }

  function useItem(itemId) {
    return enqueue(async () => {
      await Promise.all([
        root.GameInventory.ready(),
        root.GameCultivation.ready(),
        root.GamePlayerGrowth.ready()
      ]);
      const item = root.GameInventory.getItem(itemId);
      if (!item || !['cultivation', 'attribute'].includes(item.type)) {
        return { changed: false, reason: 'not_usable', item };
      }
      const cultivation = root.GameCultivation.getSnapshot();
      if (item.type === 'cultivation' && (cultivation.maxRealm || cultivation.canBreakthrough)) {
        return { changed: false, reason: cultivation.maxRealm ? 'max_realm' : 'bottleneck', item };
      }
      const removed = await root.GameInventory.remove(itemId, 1, 'use_item');
      if (!removed.changed) return { changed: false, reason: removed.reason, item };
      const result = item.type === 'cultivation'
        ? await root.GameCultivation.addCultivation(item.cultivation_gain, 'item')
        : await root.GamePlayerGrowth.addBonus(item.attribute, item.attribute_gain, 'item');
      if (!result.changed) {
        await root.GameInventory.add(itemId, 1, 'item_refund');
        return { changed: false, reason: result.reason || 'effect_failed', item };
      }
      return {
        changed: true,
        item,
        result,
        text: item.type === 'cultivation'
          ? `服用${item.name}，修为 +${result.gain}`
          : `使用${item.name}，${attributeNames[item.attribute]} +${result.gain}`
      };
    });
  }

  root.GameShop = { getShop, effectLabel, purchase, useItem };
}(window));
