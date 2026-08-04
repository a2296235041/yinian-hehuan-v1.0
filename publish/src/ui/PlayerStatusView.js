(function installPlayerStatusView(root) {
  'use strict';

  const font = '"Noto Serif SC", serif';
  const attributes = [
    ['strength', '力量'], ['constitution', '根骨'],
    ['agility', '身法'], ['intelligence', '神识'],
    ['charisma', '魅力'], ['wisdom', '悟性'], ['luck', '气运']
  ];

  function addText(scene, x, y, text, style, originX = 0) {
    return scene.add.text(x, y, text, { fontFamily: font, ...style })
      .setOrigin(originX, 0.5);
  }

  function createFrame(scene) {
    const frame = scene.add.graphics().setDepth(20);
    frame.fillStyle(0x170f16, 0.97);
    frame.fillRoundedRect(16, 110, 392, 350, 8);
    frame.lineStyle(1, 0xe5bd78, 0.42);
    frame.strokeRoundedRect(16, 110, 392, 350, 8);
    frame.lineStyle(1, 0xf0a8bb, 0.26);
    frame.strokeRoundedRect(23, 117, 378, 336, 5);
    frame.lineStyle(1, 0xe5bd78, 0.2);
    frame.lineBetween(38, 306, 386, 306);
    frame.lineBetween(38, 414, 386, 414);
    return frame;
  }

  function create(scene) {
    const statusPanel = Game.UISkin.addPanel(scene, 183, 58, 340, 92, 'wide', {
      depth: 20, alpha: 0.97
    });
    const avatarRing = scene.add.circle(62, 58, 31, 0x17110f, 1)
      .setStrokeStyle(2, 0xe5bd78, 0.9).setDepth(21);
    const maskShape = scene.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillCircle(62, 58, 27);
    const avatarImage = scene.add.image(62, 58, 'npc-scholar')
      .setDisplaySize(62, 62).setMask(maskShape.createGeometryMask()).setDepth(22);
    fitAvatar(avatarImage);
    const nameText = addText(scene, 104, 31, '', {
      fontSize: '16px', color: '#fff8fa', fixedWidth: 200
    }).setDepth(21);
    const dayText = addText(scene, 104, 63, '', {
      fontSize: '14px', color: '#f4dfe5', fixedWidth: 128
    }).setDepth(21);
    const realmText = addText(scene, 226, 63, '', {
      fontSize: '14px', color: '#e5bd78', fixedWidth: 92
    }).setDepth(21);
    const toggleText = addText(scene, 326, 28, '⌄', {
      fontFamily: 'serif', fontSize: '18px', color: '#e5bd78'
    }, 0.5).setDepth(22);
    const hitArea = scene.add.rectangle(183, 58, 340, 92, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true }).setDepth(23);
    const detailContainer = scene.add.container(0, 0).setDepth(20).setVisible(false);
    const detailObjects = [
      createFrame(scene), scene.add.rectangle(212, 285, 392, 350, 0xffffff, 0.001).setInteractive()
    ];
    detailObjects.push(addText(scene, 38, 132, '修行档案', {
      fontSize: '14px', color: '#e5bd78'
    }));
    const identityTexts = {};
    [['origin', '身份', 158], ['talent', '天赋', 184], ['realm', '境界', 210]]
      .forEach(([key, label, y]) => {
        detailObjects.push(addText(scene, 40, y, label, {
          fontSize: '13px', color: '#bdaab1', fixedWidth: 46
        }));
        identityTexts[key] = addText(scene, 92, y, '', {
          fontSize: '14px', color: '#fff8fa', fixedWidth: 286
        });
        detailObjects.push(identityTexts[key]);
      });
    const cultivationLabel = addText(scene, 40, 238, '', {
      fontSize: '13px', color: '#f0a8bb', fixedWidth: 340
    });
    const progressTrack = scene.add.rectangle(40, 260, 344, 8, 0x342832, 1)
      .setOrigin(0, 0.5).setStrokeStyle(1, 0x8e7a82, 0.45);
    const progressFill = scene.add.rectangle(40, 260, 344, 6, 0xd9577b, 1)
      .setOrigin(0, 0.5);
    const staminaText = addText(scene, 40, 286, '', {
      fontSize: '13px', color: '#fff8fa', fixedWidth: 170
    });
    const practiceText = addText(scene, 216, 286, '', {
      fontSize: '13px', color: '#fff8fa', fixedWidth: 168
    });
    detailObjects.push(cultivationLabel, progressTrack, progressFill, staminaText, practiceText);
    detailObjects.push(addText(scene, 38, 324, '基础属性', {
      fontSize: '14px', color: '#e5bd78'
    }));
    const attributeTexts = {};
    attributes.forEach(([key, label], index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const x = (row === 0 ? 42 : 86) + column * 89;
      const y = 350 + row * 42;
      detailObjects.push(addText(scene, x, y - 9, label, {
        fontSize: '11px', color: '#bdaab1', fixedWidth: 78, align: 'center'
      }));
      attributeTexts[key] = addText(scene, x, y + 10, '0', {
        fontFamily: 'serif', fontSize: '17px', color: '#fff8fa',
        fixedWidth: 78, align: 'center'
      });
      detailObjects.push(attributeTexts[key]);
    });
    const combatTexts = {};
    [['attack', '攻击'], ['defense', '防御'], ['speed', '速度']].forEach(([key, label], index) => {
      const x = 48 + index * 116;
      combatTexts[key] = addText(scene, x, 437, `${label} 0`, {
        fontSize: '13px', color: index === 0 ? '#f0a8bb' : '#fff8fa',
        fixedWidth: 104, align: 'center'
      });
      detailObjects.push(combatTexts[key]);
    });
    detailContainer.add(detailObjects);
    const view = {
      scene, statusPanel, avatarImage, maskShape, nameText, dayText, realmText,
      toggleText, hitArea, detailContainer, identityTexts, cultivationLabel,
      progressFill, staminaText, practiceText, attributeTexts, combatTexts,
      visible: false, playerName: '无名修士'
    };
    hitArea.on('pointerover', () => statusPanel.setAlpha(0.88));
    hitArea.on('pointerout', () => statusPanel.setAlpha(1));
    hitArea.on('pointerdown', () => toggle(view));
    return view;
  }

  function update(view) {
    if (!view || !root.Game.player) return;
    const player = root.Game.player;
    const stats = root.GamePlayerStats.getSnapshot();
    const cultivation = root.GameCultivation.getSnapshot();
    view.nameText.setText(root.Game.TextBoxUtils.fit(
      view.playerName || stats.originName || '无名修士', 12, 1
    ));
    view.dayText.setText(root.GameTime.getSnapshot(player).label);
    view.realmText.setText(cultivation.label);
    view.identityTexts.origin.setText(root.Game.TextBoxUtils.fit(stats.originName, 20, 1));
    view.identityTexts.talent.setText(root.Game.TextBoxUtils.fit(stats.talentName, 20, 1));
    view.identityTexts.realm.setText(cultivation.label);
    const progress = cultivation.maxRealm ? 100 : Math.max(0, Number(cultivation.percent) || 0);
    view.cultivationLabel.setText(cultivation.maxRealm
      ? '修为　已臻化境'
      : `修为　${cultivation.progress} / ${cultivation.required}（${progress}%）`);
    view.progressFill.setScale(Math.max(0, Math.min(1, progress / 100)), 1);
    view.staminaText.setText(`精力　${player.stamina} / ${player.maxStamina}`);
    view.practiceText.setText(
      `今日修炼　${player.dailyCultivationCount} / ${player.maxDailyCultivation}`
    );
    attributes.forEach(([key]) => view.attributeTexts[key].setText(String(stats[key])));
    view.combatTexts.attack.setText(`攻击 ${stats.attack}`);
    view.combatTexts.defense.setText(`防御 ${stats.defense}`);
    view.combatTexts.speed.setText(`速度 ${stats.speed}`);
  }

  function toggle(view) {
    if (!view) return;
    view.visible = !view.visible;
    view.detailContainer.setVisible(view.visible);
    view.toggleText.setText(view.visible ? '⌃' : '⌄');
    root.GameAudio.sfx('click');
    update(view);
  }

  function fitAvatar(image) {
    if (!image?.active) return;
    const size = 62;
    const scale = Math.max(size / (Number(image.width) || size), size / (Number(image.height) || size));
    image.setScale(scale);
  }

  async function loadProfile(scene, view) {
    const profile = await root.PlatformBridge.getPlayerProfile();
    view.playerName = profile.name || root.Game.player?.origin?.name || '无名修士';
    update(view);
    if (!profile.avatarUrl || !view.avatarImage?.active) return;
    const key = 'player-avatar';
    if (scene.textures.exists(key)) {
      view.avatarImage.setTexture(key);
      return fitAvatar(view.avatarImage);
    }
    try {
      scene.load.once('loaderror', (file) => {
        if (file.key === key) console.warn('玩家头像加载失败，继续使用默认头像');
      });
      scene.load.once('complete', () => {
        if (view.avatarImage?.active && scene.textures.exists(key)) {
          view.avatarImage.setTexture(key);
          fitAvatar(view.avatarImage);
        }
      });
      scene.load.image(key, profile.avatarUrl);
      scene.load.start();
    } catch (error) {
      console.error('玩家头像加载失败:', error.code || '', error.message, error.stack);
    }
  }

  root.Game.PlayerStatusView = Object.freeze({ create, update, toggle, loadProfile });
}(window));
