(function installTransitionMessageBox(root) {
  'use strict';

  const WIDTH = 900;
  const TEXT_WIDTH = 790;
  const MIN_HEIGHT = 96;
  const MAX_HEIGHT = 270;

  function heightFor(textHeight) {
    return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.ceil(textHeight + 58)));
  }

  function corner(frame, x, y, directionX, directionY) {
    frame.lineBetween(x, y, x + 24 * directionX, y);
    frame.lineBetween(x, y, x, y + 16 * directionY);
  }

  function draw(frame, height) {
    const left = -WIDTH / 2;
    const top = -height / 2;
    const right = WIDTH / 2;
    const bottom = height / 2;
    frame.clear();
    frame.fillStyle(0x080507, 0.34);
    frame.fillRoundedRect(left + 8, top + 10, WIDTH, height, 10);
    frame.fillStyle(0x2c1322, 0.96);
    frame.fillRoundedRect(left, top, WIDTH, height, 8);
    frame.lineStyle(1, 0xf0a8bb, 0.7);
    frame.strokeRoundedRect(left, top, WIDTH, height, 8);
    frame.lineStyle(1, 0xd8c38c, 0.34);
    frame.strokeRoundedRect(left + 9, top + 9, WIDTH - 18, height - 18, 5);
    frame.lineStyle(2, 0xd9577b, 0.76);
    frame.lineBetween(-152, top, -20, top);
    frame.lineBetween(20, top, 152, top);
    frame.lineStyle(1, 0xd8c38c, 0.62);
    corner(frame, left + 18, top + 18, 1, 1);
    corner(frame, right - 18, top + 18, -1, 1);
    corner(frame, left + 18, bottom - 18, 1, -1);
    corner(frame, right - 18, bottom - 18, -1, -1);
  }

  function create(scene) {
    const frame = scene.add.graphics();
    const hitTarget = scene.add.zone(0, 0, WIDTH, MIN_HEIGHT)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const crest = scene.add.text(0, 0, '◆', {
      fontFamily: 'serif',
      fontSize: '17px',
      color: '#efd39c'
    }).setOrigin(0.5);
    const text = scene.add.text(0, 4, '', {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '23px',
      color: '#fff8fa',
      align: 'center',
      lineSpacing: 8,
      fixedWidth: TEXT_WIDTH,
      wordWrap: { width: TEXT_WIDTH, useAdvancedWrap: true }
    }).setOrigin(0.5);
    const container = scene.add.container(640, 360, [frame, crest, text, hitTarget])
      .setDepth(40)
      .setAlpha(0)
      .setVisible(false);

    function layout(message) {
      const fitted = root.Game.TextBoxUtils.fit(message, 42, 6);
      text.setText(fitted);
      const height = heightFor(text.height);
      crest.setY(-height / 2 + 17);
      draw(frame, height);
      container.setSize(WIDTH, height);
      hitTarget.setSize(WIDTH, height);
      hitTarget.input?.hitArea?.setTo(0, 0, WIDTH, height);
      container.setPosition(640, 360);
      return fitted;
    }

    return { container, hitTarget, text, layout };
  }

  root.Game.TransitionMessageBox = Object.freeze({ create, heightFor });
}(window));
