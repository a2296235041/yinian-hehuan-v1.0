(function installShopPurchaseController(root) {
  'use strict';

  const failures = {
    insufficient: '灵石不足，无法购得所选数量。',
    invalid_quantity: '购买数量必须在 1 至 99 之间。',
    inventory_limit: '所选数量会超过该物品的背包上限。',
    delivery_failed: '货物入袋失败，灵石已经退还。'
  };

  async function run(scene, offer, button, quantity) {
    if (scene.busy) return;
    scene.busy = true;
    const requestId = ++scene.requestId;
    button.disableInteractive().setText('交易中…');
    scene.statusText.setText(`掌柜正在清点 ${quantity} 件货物…`);
    try {
      const result = await root.GameShop.purchase(scene.buildingId, offer.itemId, quantity);
      if (requestId !== scene.requestId || !scene.statusText?.active) return;
      if (!result.changed) {
        root.GameAudio.sfx('deny');
        scene.statusText.setText(failures[result.reason] || '交易未能完成，请稍后再试。');
        return;
      }
      root.GameAudio.sfx('success');
      scene.statusText.setText(
        `交易完成：花费 ${result.totalPrice} 灵石，购得${result.item.name} ×${result.quantity}，剩余灵石 ${result.balance}。`
      );
    } catch (error) {
      console.error('批量购买失败:', error.code || '', error.message, error.stack);
      if (requestId === scene.requestId && scene.statusText?.active) {
        root.GameAudio.sfx('deny');
        scene.statusText.setText('交易失败，请稍后重试。');
      }
    } finally {
      if (requestId === scene.requestId) scene.busy = false;
      if (button.active) button.setText(`购买 · ${offer.price} 灵石`)
        .setInteractive({ useHandCursor: true });
      scene.refreshBalance();
    }
  }

  root.Game.ShopPurchaseController = Object.freeze({ run });
}(window));
