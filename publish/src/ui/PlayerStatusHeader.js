(function installPlayerStatusHeader(root) {
  'use strict';

  const font = '"Noto Serif SC", serif';

  function text(scene, x, y, value, style, originX = 0) {
    return scene.add.text(x, y, value, { fontFamily: font, ...style })
      .setOrigin(originX, 0.5);
  }

  function fitAvatar(image) {
    if (!image?.active) return;
    const size = 62;
    const scale = Math.max(
      size / (Number(image.width) || size),
      size / (Number(image.height) || size)
    );
    image.setScale(scale);
  }

  function create(scene, onToggle) {
    const panel = root.Game.UISkin.addPanel(scene, 212, 58, 392, 92, 'wide', {
      depth: 20, alpha: 0.97
    });
    const decor = scene.add.graphics().setDepth(21);
    decor.lineStyle(1, 0xe5bd78, 0.24);
    decor.lineBetween(100, 45, 388, 45);
    decor.lineBetween(246, 53, 246, 80);
    scene.add.circle(62, 58, 31, 0x17110f, 1)
      .setStrokeStyle(2, 0xe5bd78, 0.9).setDepth(21);
    const maskShape = scene.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillCircle(62, 58, 27);
    const avatarImage = scene.add.image(62, 58, 'npc-scholar')
      .setDisplaySize(62, 62).setMask(maskShape.createGeometryMask()).setDepth(22);
    fitAvatar(avatarImage);
    const nameText = text(scene, 104, 28, '', {
      fontSize: '16px', color: '#fff8fa', fixedWidth: 264
    }).setDepth(22);
    text(scene, 104, 65, '历程', {
      fontSize: '11px', color: '#bdaab1', fixedWidth: 36
    }).setDepth(22);
    const dayText = text(scene, 144, 65, '', {
      fontSize: '14px', color: '#fff8fa', fixedWidth: 92
    }).setDepth(22);
    text(scene, 260, 65, '境界', {
      fontSize: '11px', color: '#bdaab1', fixedWidth: 36
    }).setDepth(22);
    const realmText = text(scene, 300, 65, '', {
      fontSize: '14px', color: '#e5bd78', fixedWidth: 82
    }).setDepth(22);
    const toggleText = text(scene, 391, 27, '⌄', {
      fontFamily: 'serif', fontSize: '17px', color: '#e5bd78'
    }, 0.5).setDepth(22);
    const hitArea = scene.add.rectangle(212, 58, 392, 92, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true }).setDepth(23);
    hitArea.on('pointerover', () => panel.setAlpha(0.88));
    hitArea.on('pointerout', () => panel.setAlpha(1));
    hitArea.on('pointerdown', onToggle);
    return {
      panel, decor, maskShape, avatarImage, nameText, dayText, realmText,
      toggleText, hitArea
    };
  }

  function update(header, values) {
    header.nameText.setText(root.Game.TextBoxUtils.fit(values.name, 16, 1));
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
