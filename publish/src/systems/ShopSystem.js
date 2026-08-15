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
  const persistence = root.GamePersistenceStatus;

  function normalizeQuantity(value) {
    const quantity = Math.floor(Number(value) || 0);
    return quantity >= 1 && quantity <= 9999 ? quantity : 0;
  }

  function normalizePurchaseQuantity(value) {
    const quantity = Math.floor(Number(value) || 0);
    return quantity >= 1 && quantity <= 99 ? quantity : 0;
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

  function purchase(buildingId, itemId, quantity = 1) {
    return enqueue(async () => {
      await root.GameInventory.ready();
      const shop = getShop(buildingId);
      const offer = shop?.offers.find((entry) => entry.itemId === itemId);
      if (!offer) return persistence.result('商店交易', false, true, { reason: 'not_sold' });
      const purchaseQuantity = normalizePurchaseQuantity(quantity);
      if (!purchaseQuantity) {
        return persistence.result('商店交易', false, true, {
          reason: 'invalid_quantity', offer
        });
      }
      if (root.GameInventory.getQuantity(itemId) + purchaseQuantity > 9999) {
        return persistence.result('商店交易', false, true, {
          reason: 'inventory_limit', offer
        });
      }
      const totalPrice = offer.price * purchaseQuantity;
      const spent = await root.GameInventory.removeSpiritStones(totalPrice, 'shop');
      if (!spent.changed) {
        return persistence.result('商店交易', false, spent.durable !== false, {
          reason: spent.reason, offer
        });
      }
      const added = await root.GameInventory.add(itemId, purchaseQuantity, 'shop');
      if (!added.changed) {
        const refund = await root.GameInventory.addSpiritStones(totalPrice, 'shop_refund');
        return persistence.result(
          '商店交易',
          false,
          spent.durable !== false && refund.durable !== false,
          {
            reason: 'delivery_failed',
            offer,
            reconciliationRequired: refund.durable === false,
            refund
          }
        );
      }
      return persistence.combine('商店交易', [spent, added], {
        offer,
        item: added.item,
        quantity: purchaseQuantity,
        totalPrice,
        balance: root.GameInventory.getSpiritStones()
      });
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
      if (!requestedQuantity) {
        return persistence.result('物品使用', false, true, {
          reason: 'invalid_quantity', item
        });
      }
      if (!item || !['cultivation', 'attribute'].includes(item.type)) {
        return persistence.result('物品使用', false, true, { reason: 'not_usable', item });
      }
      if (root.GameInventory.getQuantity(itemId) < requestedQuantity) {
        return persistence.result('物品使用', false, true, { reason: 'insufficient', item });
      }
      const cultivation = root.GameCultivation.getSnapshot();
      if (item.type === 'cultivation' && (cultivation.maxRealm || cultivation.canBreakthrough)) {
        return persistence.result('物品使用', false, true, {
          reason: cultivation.maxRealm ? 'max_realm' : 'bottleneck', item
        });
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
        return persistence.result('物品使用', false, true, {
          reason: item.type === 'cultivation' ? 'bottleneck' : 'max_attribute', item
        });
      }
      const removed = await root.GameInventory.remove(itemId, usefulQuantity, 'use_item');
      if (!removed.changed) {
        return persistence.result('物品使用', false, removed.durable !== false, {
          reason: removed.reason, item
        });
      }
      const result = item.type === 'cultivation'
        ? await root.GameCultivation.addCultivation(unitGain * usefulQuantity, 'item')
        : await root.GamePlayerGrowth.addBonus(
          item.attribute, unitGain * usefulQuantity, 'item'
        );
      if (!result.changed) {
        const refund = await root.GameInventory.add(itemId, usefulQuantity, 'item_refund');
        return persistence.result(
          '物品使用',
          false,
          removed.durable !== false && refund.durable !== false,
          {
            reason: result.reason || 'effect_failed',
            item,
            reconciliationRequired: refund.durable === false,
            refund
          }
        );
      }
      return persistence.combine('物品使用', [removed, result], {
        item,
        requestedQuantity,
        usedQuantity: usefulQuantity,
        partial: usefulQuantity < requestedQuantity,
        result,
        text: item.type === 'cultivation'
          ? `服用${item.name} ×${usefulQuantity}，修为 +${result.gain}`
          : `使用${item.name} ×${usefulQuantity}，${attributeNames[item.attribute]} +${result.gain}`
      });
    });
  }

  root.GameShop = { getShop, effectLabel, purchase, useItem };
}(window));
