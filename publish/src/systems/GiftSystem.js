(function installGiftSystem(root) {
  'use strict';

  let busy = false;
  const persistence = root.GamePersistenceStatus;

  // 赠礼横跨储物袋和好感度两个存档，因此统一在此处串行处理。
  // 若好感度端拒绝本次赠礼，会把已经扣除的物品立即退回。
  async function give(npcId, itemId) {
    if (busy) return persistence.result('赠礼', false, true, { reason: 'busy' });
    busy = true;
    try {
      await Promise.all([root.GameInventory.ready(), root.GameAffinity.ready()]);
      const item = root.GameInventory.getItem(itemId);
      if (!item || Number(item.gift_affinity) <= 0) {
        return persistence.result('赠礼', false, true, { reason: 'invalid_item' });
      }
      const affinity = root.GameAffinity.getSnapshot(npcId);
      if (!affinity.canGift) {
        return persistence.result('赠礼', false, true, {
          reason: 'daily_limit', snapshot: affinity, item
        });
      }
      const consumed = await root.GameInventory.remove(itemId, 1, 'gift');
      if (!consumed.changed) {
        return persistence.result('赠礼', false, consumed.durable !== false, {
          reason: consumed.reason, snapshot: affinity, item
        });
      }
      const result = await root.GameAffinity.giveGift(npcId, item.gift_affinity);
      if (!result.changed) {
        const refund = await root.GameInventory.add(itemId, 1, 'gift_refund');
        return persistence.result(
          '赠礼',
          false,
          consumed.durable !== false && refund.durable !== false,
          {
            ...result,
            item,
            reconciliationRequired: refund.durable === false,
            refund
          }
        );
      }
      return persistence.combine('赠礼', [consumed, result], {
        ...result,
        item,
        gain: result.gain,
        inventoryDurable: consumed.durable
      });
    } finally {
      busy = false;
    }
  }

  root.GameGift = { give, isBusy: () => busy };
}(window));
