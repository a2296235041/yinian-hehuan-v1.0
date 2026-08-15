(function installInventoryUseController(root) {
  'use strict';

  const failureMessages = {
    bottleneck: '修为已达瓶颈，请先找 NPC 双修突破。',
    max_realm: '当前修炼体系已达最高境界。',
    max_attribute: '该项永久属性已达到可提升上限。',
    insufficient: '物品数量不足。',
    invalid_quantity: '请选择有效的使用数量。'
  };

  async function run(scene, item, quantity) {
    if (scene.busyItemId) return;
    scene.busyItemId = item.id;
    const requestId = ++scene.requestId;
    scene.useStatusText.setText(`正在使用${item.name} ×${quantity}…`);
    try {
      const result = await root.GameShop.useItem(item.id, quantity);
      if (requestId !== scene.requestId || !scene.useStatusText?.active) return;
      if (!result.changed) {
        root.GameAudio.sfx('deny');
        root.GamePersistenceStatus?.report?.('物品使用', result);
        const syncNotice = result.syncMessage ? ` ${result.syncMessage}` : '';
        scene.useStatusText.setText(
          `${failureMessages[result.reason] || '此物暂时无法使用。'}${syncNotice}`
        );
        return;
      }
      root.GamePersistenceStatus?.report?.('物品使用', result);
      root.GameAudio.sfx('success');
      const partial = result.partial
        ? `临近当前上限，实际使用 ${result.usedQuantity} 个。`
        : '';
      scene.useStatusText.setText(
        `${partial}物品生效${result.syncMessage ? `，${result.syncMessage}` : ''}，AI 正在补全这一幕…`
      );
      const story = await root.GameNarrative.generateDetailed('use_item', {
        item: item.name,
        quantity: result.usedQuantity,
        effect: root.GameShop.effectLabel(item, result.usedQuantity),
        realm: root.GameCultivation.getSnapshot().label,
        attributes: root.GamePlayerStats.getSnapshot()
      }, `${partial}${result.text}`);
      if (requestId === scene.requestId && scene.useStatusText.active) {
        scene.useStatusText.setText(story);
      }
    } catch (error) {
      console.error('批量使用物品失败:', error.code || '', error.message, error.stack);
      if (requestId === scene.requestId && scene.useStatusText?.active) {
        root.GameAudio.sfx('deny');
        scene.useStatusText.setText('物品使用失败，请稍后重试。');
      }
    } finally {
      if (requestId === scene.requestId) scene.busyItemId = null;
      if (scene.sys.isActive()) scene.renderItems();
    }
  }

  root.Game.InventoryUseController = Object.freeze({ run });
}(window));
