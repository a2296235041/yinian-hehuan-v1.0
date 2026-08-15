(function installItemIconAssets(root) {
  'use strict';

  const pending = new Map();

  function key(item) {
    return `item-icon-${String(item?.id || 'unknown').replaceAll('_', '-')}`;
  }

  function ensureLoaded(scene, item) {
    const textureKey = key(item);
    if (scene.textures.exists(textureKey)) return Promise.resolve(textureKey);
    if (!item?.icon) return Promise.reject(new Error(`物品图标路径缺失: ${item?.id || 'unknown'}`));
    if (pending.has(textureKey)) return pending.get(textureKey);
    const task = new Promise((resolve, reject) => {
      const complete = `filecomplete-image-${textureKey}`;
      const cleanup = () => {
        scene.load.off(complete, onComplete);
        scene.load.off('loaderror', onError);
      };
      const onComplete = () => {
        cleanup();
        resolve(textureKey);
      };
      const onError = (file) => {
        if (file?.key !== textureKey) return;
        cleanup();
        reject(new Error(`物品图标加载失败: ${item.name || item.id}`));
      };
      scene.load.once(complete, onComplete);
      scene.load.on('loaderror', onError);
      scene.load.image(textureKey, root.Game.AssetUrl.withVersion(item.icon));
      if (!scene.load.isLoading()) scene.load.start();
    }).finally(() => pending.delete(textureKey));
    pending.set(textureKey, task);
    return task;
  }

  function createFrame(scene, x, y, rarity) {
    const color = root.Game.CommerceDecor.rarityColors[rarity]
      || root.Game.CommerceDecor.rarityColors.普通;
    const frame = scene.add.graphics();
    frame.fillStyle(0x100c11, 0.92);
    frame.fillRoundedRect(x - 37, y - 37, 74, 74, 6);
    frame.lineStyle(1, color, 0.72);
    frame.strokeRoundedRect(x - 37, y - 37, 74, 74, 6);
    frame.lineStyle(2, color, 0.34);
    frame.lineBetween(x - 27, y - 32, x + 27, y - 32);
    return frame;
  }

  function create(scene, item, x, y, track) {
    const frame = track(createFrame(scene, x, y, item.rarity));
    const textureKey = key(item);
    if (scene.textures.exists(textureKey)) {
      track(scene.add.image(x, y, textureKey).setDisplaySize(64, 64));
      return;
    }
    const placeholders = root.Game.CommerceDecor.addSeal(
      scene, x, y, root.Game.InventoryGridView.typeLabel(item.type), item.rarity
    );
    placeholders.forEach(track);
    ensureLoaded(scene, item).then((loadedKey) => {
      if (!frame.active || !scene.sys.isActive()) return;
      placeholders.forEach((object) => {
        if (object.active) object.destroy();
      });
      track(scene.add.image(x, y, loadedKey).setDisplaySize(64, 64));
    }).catch((error) => {
      console.error('物品图标加载失败:', error.message, error.stack);
    });
  }

  root.Game.ItemIconAssets = Object.freeze({ key, ensureLoaded, create });
}(window));
