(function installPlayerStatusHeader(root) {
  'use strict';

  const font = '"Noto Serif SC", serif';
  const cropCache = new WeakMap();

  function text(scene, x, y, value, style, originX = 0) {
    return scene.add.text(x, y, value, { fontFamily: font, ...style })
      .setOrigin(originX, 0.5);
  }

  function avatarSourceRect(source) {
    const width = Number(source?.width) || 1;
    const height = Number(source?.height) || 1;
    const cached = cropCache.get(source);
    if (cached) return cached;

    const fallback = width / height > 1
      ? {
        x: Math.floor((width - height) / 2),
        y: 0,
        width: height,
        height
      }
      : {
        x: 0,
        y: Math.floor((height - width) * 0.12),
        width,
        height: width
      };

    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(source, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      const bounds = (startY, endY) => {
        let minX = width;
        let minY = endY;
        let maxX = -1;
        let maxY = -1;
        for (let y = startY; y < endY; y += 2) {
          for (let x = 0; x < width; x += 2) {
            if (pixels[(y * width + x) * 4 + 3] < 16) continue;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
        return { minX, minY, maxX, maxY };
      };
      const full = bounds(0, height);
      if (full.maxX >= full.minX && full.maxY >= full.minY) {
        const contentHeight = full.maxY - full.minY + 1;
        const focus = bounds(
          full.minY,
          Math.min(height, full.minY + Math.floor(contentHeight * 0.38))
        );
        const focusWidth = Math.max(1, focus.maxX - focus.minX + 1);
        const contentWidth = Math.max(1, full.maxX - full.minX + 1);
        const cropSize = Math.min(
          width,
          height,
          Math.max(focusWidth * 1.42, contentWidth * 0.58)
        );
        const centerX = (focus.minX + focus.maxX) / 2;
        const x = Math.max(0, Math.min(
          width - cropSize,
          centerX - cropSize / 2
        ));
        const y = Math.max(0, Math.min(
          height - cropSize,
          full.minY - cropSize * 0.04
        ));
        const rect = {
          x: Math.floor(x),
          y: Math.floor(y),
          width: Math.floor(cropSize),
          height: Math.floor(cropSize)
        };
        cropCache.set(source, rect);
        return rect;
      }
    } catch (error) {
      console.warn('头像透明边界分析失败，使用等比裁切:', error.message);
    }
    cropCache.set(source, fallback);
    return fallback;
  }

  function fitAvatar(image) {
    if (!image?.active) return;
    const size = 52;
    const source = image.texture?.getSourceImage?.();
    if (source) {
      const rect = avatarSourceRect(source);
      image.setCrop(rect.x, rect.y, rect.width, rect.height);
    } else {
      image.setCrop();
    }
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
    maskShape.fillCircle(50, 50, 24);
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
    header.avatarImage.setTexture(textureKey);
    fitAvatar(header.avatarImage);
  }

  root.Game.PlayerStatusHeader = Object.freeze({ create, update, setExpanded, setAvatar });
}(window));
