(function installAssetUrl(root) {
  'use strict';

  function withVersion(path) {
    const source = String(path || '');
    if (!source || /^(?:data:|blob:|https?:)/i.test(source)) return source;
    const version = root.GameRelease?.build || 'dev';
    const separator = source.includes('?') ? '&' : '?';
    return `${source}${separator}v=${encodeURIComponent(version)}`;
  }

  const game = root.Game || (root.Game = {});
  game.AssetUrl = Object.freeze({ withVersion });
}(window));
