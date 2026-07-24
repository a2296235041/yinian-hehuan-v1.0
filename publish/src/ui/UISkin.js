var Game = window.Game || {};

Game.UISkin = {
    colors: {
        ink: 0x321522,
        panel: 0x26131f,
        panelSoft: 0x4b1d35,
        rose: 0xd9577b,
        roseLight: 0xf0a8bb,
        white: 0xfff8fa
    },

    addPanel(scene, x, y, width, height, variant = 'card', options = {}) {
        const panel = scene.add.graphics().setPosition(x, y);
        const fill = variant === 'wide' ? this.colors.panelSoft : this.colors.panel;
        panel.fillStyle(fill, options.alpha ?? 0.94);
        panel.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
        panel.lineStyle(1, this.colors.roseLight, 0.34);
        panel.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
        panel.lineStyle(2, this.colors.rose, 0.48);
        panel.strokeRoundedRect(
            -width / 2 + 8, -height / 2 + 8, width - 16, height - 16, 8
        );
        if (options.depth !== undefined) panel.setDepth(options.depth);
        return panel;
    },

    makeButton(scene, x, y, label, action, options = {}) {
        const width = options.width || 150;
        const height = options.height || 48;
        const secondary = options.variant === 'secondary';
        const background = scene.add.graphics();
        background.fillStyle(
            secondary ? this.colors.panelSoft : this.colors.rose,
            secondary ? 0.94 : 0.98
        );
        background.fillRoundedRect(-width / 2, -height / 2, width, height, 9);
        background.lineStyle(1, this.colors.white, secondary ? 0.38 : 0.76);
        background.strokeRoundedRect(-width / 2, -height / 2, width, height, 9);
        background.lineStyle(2, this.colors.roseLight, 0.42);
        background.strokeRoundedRect(
            -width / 2 + 4, -height / 2 + 4, width - 8, height - 8, 6
        );
        const text = scene.add.text(0, 0, label, {
            fontFamily: options.fontFamily || '"Noto Serif SC", serif',
            fontSize: `${options.fontSize || 18}px`,
            color: secondary ? '#fff8fa' : '#321522',
            align: 'center',
            fixedWidth: Math.max(44, width - 24),
            wordWrap: { width: Math.max(44, width - 24), useAdvancedWrap: true }
        }).setOrigin(0.5);
        const button = scene.add.container(x, y, [background, text])
            .setSize(width, height);
        if (options.depth !== undefined) button.setDepth(options.depth);

        const nativeSetInteractive = button.setInteractive.bind(button);
        button.setInteractive = (config = {}) => {
            nativeSetInteractive(
                new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
                Phaser.Geom.Rectangle.Contains
            );
            if (button.input && config.useHandCursor) button.input.cursor = 'pointer';
            return button;
        };
        button.setText = (value) => {
            text.setText(value);
            return button;
        };
        button.labelText = text;
        button.setInteractive({ useHandCursor: true });
        button.on('pointerdown', (pointer, localX, localY, event) => {
            if (options.stopPropagation) {
                event?.stopPropagation?.();
                pointer?.event?.stopPropagation?.();
            }
            scene.tweens.add({ targets: button, scale: 0.95, duration: 70, yoyo: true });
            if (action) action(button);
        });
        button.on('pointerover', () => background.setAlpha(0.84));
        button.on('pointerout', () => background.setAlpha(1));
        return button;
    }
};
