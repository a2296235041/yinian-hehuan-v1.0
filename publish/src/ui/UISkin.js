var Game = window.Game || {};

Game.UISkin = {
    textures: {
        panelWide: 'ui-panel-wide',
        panelCard: 'ui-panel-card',
        primary: 'ui-button-primary',
        secondary: 'ui-button-secondary'
    },

    addPanel(scene, x, y, width, height, variant = 'card', options = {}) {
        const key = variant === 'wide' ? this.textures.panelWide : this.textures.panelCard;
        const panel = scene.add.image(x, y, key).setDisplaySize(width, height);
        if (options.depth !== undefined) panel.setDepth(options.depth);
        if (options.alpha !== undefined) panel.setAlpha(options.alpha);
        return panel;
    },

    makeButton(scene, x, y, label, action, options = {}) {
        const width = options.width || 150;
        const height = options.height || 48;
        const variant = options.variant === 'secondary' ? 'secondary' : 'primary';
        const background = scene.add.image(0, 0, this.textures[variant])
            .setDisplaySize(width, height);
        const text = scene.add.text(0, 0, label, {
            fontFamily: options.fontFamily || '"Noto Serif SC", serif',
            fontSize: `${options.fontSize || 18}px`,
            color: variant === 'primary' ? '#14231f' : '#f4ead2',
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
        button.on('pointerdown', () => {
            scene.tweens.add({ targets: button, scale: 0.95, duration: 70, yoyo: true });
            if (action) action(button);
        });
        return button;
    }
};
