(function installGiftSystem(root) {
  'use strict';

  let busy = false;

  // 赠礼横跨储物袋和好感度两个存档，因此统一在此处串行处理。
  // 若好感度端拒绝本次赠礼，会把已经扣除的物品立即退回。
  async function give(npcId, itemId) {
    if (busy) return { changed: false, reason: 'busy' };
    busy = true;
    try {
      await Promise.all([root.GameInventory.ready(), root.GameAffinity.ready()]);
      const item = root.GameInventory.getItem(itemId);
      if (!item || Number(item.gift_affinity) <= 0) {
        return { changed: false, reason: 'invalid_item' };
      }
      const affinity = root.GameAffinity.getSnapshot(npcId);
      if (!affinity.canGift) {
        return { changed: false, reason: 'daily_limit', snapshot: affinity, item };
      }
      const consumed = await root.GameInventory.remove(itemId, 1, 'gift');
      if (!consumed.changed) {
        return { changed: false, reason: consumed.reason, snapshot: affinity, item };
      }
      const result = await root.GameAffinity.giveGift(npcId, item.gift_affinity);
      if (!result.changed) {
        await root.GameInventory.add(itemId, 1, 'gift_refund');
        return { ...result, item };
      }
      return {
        ...result,
        item,
        gain: Math.max(1, Math.floor(Number(item.gift_affinity) || 1)),
        inventoryDurable: consumed.durable
      };
    } finally {
      busy = false;
    }
  }

  root.GameGift = { give, isBusy: () => busy };
}(window));
