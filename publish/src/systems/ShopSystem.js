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
  const ATTRIBUTE_CAP = 9999;
  let queue = Promise.resolve();

  function normalizeQuantity(value) {
    const quantity = Math.floor(Number(value) || 0);
    return quantity >= 1 && quantity <= 9999 ? quantity : 0;
  }

  function displayNumber(value) {
    return Number.isInteger(value) ? String(value) : Number(value.toFixed(1)).toString();
  }

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

  function effectLabel(item, quantity = 1) {
    const count = normalizeQuantity(quantity) || 1;
    if (item.type === 'cultivation' && item.cultivation_percent) {
      return `使用后当前境界修为 +${displayNumber(item.cultivation_percent * count)}%`;
    }
    if (item.type === 'cultivation') return `使用后修为 +${item.cultivation_gain * count}`;
    if (item.type === 'attribute') {
      return `使用后${attributeNames[item.attribute] || item.attribute} +${item.attribute_gain * count}`;
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

  function useItem(itemId, quantity = 1) {
    return enqueue(async () => {
      await Promise.all([
        root.GameInventory.ready(),
        root.GameCultivation.ready(),
        root.GamePlayerGrowth.ready()
      ]);
      const item = root.GameInventory.getItem(itemId);
      const requestedQuantity = normalizeQuantity(quantity);
      if (!requestedQuantity) return { changed: false, reason: 'invalid_quantity', item };
      if (!item || !['cultivation', 'attribute'].includes(item.type)) {
        return { changed: false, reason: 'not_usable', item };
      }
      if (root.GameInventory.getQuantity(itemId) < requestedQuantity) {
        return { changed: false, reason: 'insufficient', item };
      }
      const cultivation = root.GameCultivation.getSnapshot();
      if (item.type === 'cultivation' && (cultivation.maxRealm || cultivation.canBreakthrough)) {
        return { changed: false, reason: cultivation.maxRealm ? 'max_realm' : 'bottleneck', item };
      }
      const stats = root.GamePlayerStats.getSnapshot();
      const multiplier = 1 + Number(stats.pillGainPercent || 0) / 100;
      const unitGain = item.type === 'cultivation'
        ? (item.cultivation_percent
          ? Math.max(1, Math.ceil(cultivation.required
            * Number(item.cultivation_percent) * multiplier / 100))
          : Math.max(1, Math.floor(Number(item.cultivation_gain) * multiplier)))
        : Math.max(1, Math.floor(Number(item.attribute_gain)));
      const remaining = item.type === 'cultivation'
        ? cultivation.required - cultivation.progress
        : ATTRIBUTE_CAP - Number(stats[item.attribute] || 0);
      const usefulQuantity = Math.min(
        requestedQuantity,
        Math.max(0, Math.ceil(remaining / unitGain))
      );
      if (!usefulQuantity) {
        return { changed: false, reason: item.type === 'cultivation' ? 'bottleneck' : 'max_attribute', item };
      }
      const removed = await root.GameInventory.remove(itemId, usefulQuantity, 'use_item');
      if (!removed.changed) return { changed: false, reason: removed.reason, item };
      const result = item.type === 'cultivation'
        ? await root.GameCultivation.addCultivation(unitGain * usefulQuantity, 'item')
        : await root.GamePlayerGrowth.addBonus(
          item.attribute, unitGain * usefulQuantity, 'item'
        );
      if (!result.changed) {
        await root.GameInventory.add(itemId, usefulQuantity, 'item_refund');
        return { changed: false, reason: result.reason || 'effect_failed', item };
      }
      return {
        changed: true,
        item,
        result,
        requestedQuantity,
        usedQuantity: usefulQuantity,
        partial: usefulQuantity < requestedQuantity,
        text: item.type === 'cultivation'
          ? `服用${item.name} ×${usefulQuantity}，修为 +${result.gain}`
          : `使用${item.name} ×${usefulQuantity}，${attributeNames[item.attribute]} +${result.gain}`
      };
    });
  }

  root.GameShop = { getShop, effectLabel, purchase, useItem };
}(window));
