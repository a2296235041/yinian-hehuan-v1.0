(function installGameScenePreload(root) {
  'use strict';

  const SceneClass = root.Game?.Scenes?.GameScene;
  if (!SceneClass) throw new Error('GameScene 未注册，无法安装延迟资源加载');

  const originalPreload = SceneClass.prototype.preload;
  SceneClass.prototype.preload = function preloadGameSceneAssets() {
    originalPreload?.call(this);
    const resources = [
      ['image', 'bg-sect-map', './assets/generated/sect-map.2a28a8cb.webp'],
      ['json', 'npcs', './assets/data/npcs.v025.json?v=20260815-18'],
      ['json', 'tournament_npcs', './assets/data/tournament_npcs.json?v=20260815-18'],
      ['json', 'npc_openings', './assets/data/npc_openings.v025.json?v=20260815-18'],
      ['json', 'items', './assets/data/items.json?v=20260815-18'],
      ['json', 'exploration_regions', './assets/data/exploration_regions.json?v=20260815-18'],
      ['json', 'enemies', './assets/data/enemies.json?v=20260815-18']
    ];
    this.cameras.main.setBackgroundColor('#09100e');
    const label = this.add.text(640, 330, '正在布置宗门地图', {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '24px',
      color: '#fff4f7'
    }).setOrigin(0.5);
    const progress = this.add.text(640, 374, '0%', {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '15px',
      color: '#e8b7c7'
    }).setOrigin(0.5);
    const onProgress = (value) => {
      if (progress.active) progress.setText(`${Math.round(value * 100)}%`);
    };
    this.load.on('progress', onProgress);
    this.load.once('complete', () => {
      this.load.off('progress', onProgress);
      if (label.active) label.destroy();
      if (progress.active) progress.destroy();
    });
    resources.forEach(([type, key, url]) => {
      if (type === 'image') {
        if (!this.textures.exists(key)) this.load.image(key, url);
        return;
      }
      if (!this.cache.json.exists(key)) this.load.json(key, url);
    });
  };
}(window));
