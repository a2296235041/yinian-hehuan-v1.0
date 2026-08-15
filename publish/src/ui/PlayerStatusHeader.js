(function installPlayerStatusHeader(root) {
  'use strict';

  const font = '"Noto Serif SC", serif';

  function text(scene, x, y, value, style, originX = 0) {
    return scene.add.text(x, y, value, { fontFamily: font, ...style })
      .setOrigin(originX, 0.5);
  }

  function avatarSourceRect(source) {
    const width = Number(source?.width) || 1;
    const height = Number(source?.height) || 1;
    if (width / height < 1.25) {
      return { x: 0, y: 0, width, height };
    }
    const fallback = {
      x: Math.floor(width * 0.12),
      y: 0,
      width: Math.floor(width * 0.76),
      height: Math.floor(height * 0.34)
    };
    try {
      const probe = document.createElement('canvas');
      probe.width = width;
      probe.height = height;
      const context = probe.getContext('2d', { willReadFrequently: true });
      context.drawImage(source, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      let minX = width; let minY = height; let maxX = -1; let maxY = -1;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (pixels[(y * width + x) * 4 + 3] < 12) continue;
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
      if (maxX >= minX && maxY >= minY) {
        const contentHeight = Math.max(1, maxY - minY + 1);
        return {
          x: minX,
          y: minY,
          width: Math.max(1, maxX - minX + 1),
          height: Math.min(
            Math.floor(height * 0.36),
            Math.max(220, Math.floor(contentHeight * 0.3))
          )
        };
      }
    } catch (error) {
      console.warn('头像头部区域分析失败，使用默认裁切:', error.message);
    }
    return fallback;
  }

  function createHeadTexture(header, textureKey) {
    const scene = header?.scene;
    if (!scene?.textures) return textureKey;
    const source = scene.textures.get(textureKey)?.getSourceImage?.();
    if (!source) return textureKey;
    const headKey = `player-avatar-head-${textureKey}`;
    const texture = scene.textures.exists(headKey)
      ? scene.textures.get(headKey)
      : scene.textures.createCanvas(headKey, 104, 104);
    const context = texture.getContext();
    const rect = avatarSourceRect(source);
    context.clearRect(0, 0, 104, 104);
    context.drawImage(
      source, rect.x, rect.y, rect.width, rect.height, 0, 0, 104, 104
    );
    texture.refresh();
    return headKey;
  }

  function fitAvatar(image) {
    if (!image?.active) return;
    const size = 52;
    image.setCrop();
    image.setDisplaySize(size, size);
  }

  function createPanel(scene) {
    const panel = scene.add.graphics().setDepth(20);
    panel.fillStyle(0x4b1d35, 0.94);
    panel.fillRoundedRect(12, 11, 360, 78, 7);
    panel.lineStyle(1, 0xf0a8bb, 0.32);
    panel.strokeRoundedRect(12, 11, 360, 78, 7);
    panel.lineStyle(1, 0xd9577b, 0.38);
    panel.strokeRoundedRect(17, 16, 350, 68, 4);
    return panel;
  }

  function create(scene, onToggle) {
    const panel = createPanel(scene);
    const decor = scene.add.graphics().setDepth(21);
    decor.lineStyle(1, 0xe5bd78, 0.2);
    decor.lineBetween(84, 41, 356, 41);
    decor.lineBetween(224, 48, 224, 73);
    scene.add.circle(50, 50, 26, 0x17110f, 1)
      .setStrokeStyle(1, 0xe5bd78, 0.86).setDepth(21);
    const maskShape = scene.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillCircle(50, 50, 22);
    const avatarImage = scene.add.image(50, 50, 'npc-scholar')
      .setDisplaySize(52, 52).setMask(maskShape.createGeometryMask()).setDepth(22);
    fitAvatar(avatarImage);
    const nameText = text(scene, 84, 25, '', {
      fontSize: '14px', color: '#fff8fa', fixedWidth: 250
    }).setDepth(22);
    text(scene, 84, 61, '历程', {
      fontSize: '9px', color: '#bdaab1', fixedWidth: 28
    }).setDepth(22);
    const dayText = text(scene, 116, 61, '', {
      fontSize: '12px', color: '#fff8fa', fixedWidth: 98
    }).setDepth(22);
    text(scene, 238, 61, '境界', {
      fontSize: '9px', color: '#bdaab1', fixedWidth: 28
    }).setDepth(22);
    const realmText = text(scene, 270, 61, '', {
      fontSize: '12px', color: '#e5bd78', fixedWidth: 78
    }).setDepth(22);
    const toggleText = text(scene, 359, 23, '⌄', {
      fontFamily: 'serif', fontSize: '15px', color: '#e5bd78'
    }, 0.5).setDepth(22);
    const hitArea = scene.add.rectangle(192, 50, 360, 78, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true }).setDepth(23);
    hitArea.on('pointerover', () => panel.setAlpha(0.88));
    hitArea.on('pointerout', () => panel.setAlpha(1));
    hitArea.on('pointerdown', onToggle);
    return {
      scene, panel, decor, maskShape, avatarImage, nameText, dayText, realmText,
      toggleText, hitArea
    };
  }

  function update(header, values) {
    header.nameText.setText(root.Game.TextBoxUtils.fit(values.name, 17, 1));
    header.dayText.setText(values.day);
    header.realmText.setText(values.realm);
  }

  function setExpanded(header, expanded) {
    header.toggleText.setText(expanded ? '⌃' : '⌄');
  }

  function setAvatar(header, textureKey) {
    header.avatarImage.setTexture(createHeadTexture(header, textureKey));
    fitAvatar(header.avatarImage);
  }

  root.Game.PlayerStatusHeader = Object.freeze({ create, update, setExpanded, setAvatar });
}(window));
