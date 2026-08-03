var Game = window.Game || {};

const HUD_ACTION_LABELS = new Set(['下一天', '下一时段', '修炼', '出山', '储物袋']);

Game.BattleUI = {
    setHudActionsVisible(scene, visible) {
        const uiScene = scene.scene.get('UIScene');
        if (!uiScene?.children) return;
        uiScene.children.list.forEach((child) => {
            if (!HUD_ACTION_LABELS.has(child.labelText?.text)) return;
            child.setVisible(visible);
            if (visible) child.setInteractive({ useHandCursor: true });
            else child.disableInteractive();
        });
    },

    enter(scene) {
        this.setHudActionsVisible(scene, false);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.setHudActionsVisible(scene, true);
        });
    },

    createFighter(scene, x, label, imageKey, playerSide, stats, imageFrame = null) {
        Game.UISkin.addPanel(scene, x, 286, 350, 420, 'card', { alpha: 0.9 });
        scene.add.text(x, 92, label, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '25px',
            color: playerSide ? '#f0a8bb' : '#f3b0c0'
        }).setOrigin(0.5);
        let image;
        const texture = scene.textures.get(imageKey);
        const usableTexture = texture && texture.getSourceImage?.();
        if (Number.isInteger(imageFrame) && usableTexture) {
            // 把 2×2 图集切成真实纹理帧，避免 setCrop 仍按整张图原点渲染而导致偏位。
            const source = usableTexture;
            const cellWidth = source.width / 2;
            const cellHeight = source.height / 2;
            const column = imageFrame % 2;
            const row = Math.floor(imageFrame / 2);
            const frameName = `enemy-frame-${imageFrame}`;
            if (!texture.has(frameName)) {
                texture.add(
                    frameName, 0,
                    column * cellWidth, row * cellHeight,
                    cellWidth, cellHeight
                );
            }
            image = scene.add.image(x, 255, imageKey, frameName);
            image.setScale(Math.min(240 / cellWidth, 250 / cellHeight));
        } else {
            const fallbackKey = usableTexture ? imageKey : 'npc-scholar';
            image = scene.add.image(x, 255, fallbackKey);
            image.setScale(Math.min(190 / image.width, 230 / image.height));
        }
        scene.add.text(x, 405, stats, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '14px',
            color: '#f4dfe5',
            align: 'center',
            lineSpacing: 3,
            padding: { x: 10, y: 6 }
        }).setOrigin(0.5);
        scene.add.rectangle(x - 150, 458, 300, 18, 0x10201b).setOrigin(0, 0.5);
        const bar = scene.add.rectangle(x - 150, 458, 300, 14,
            playerSide ? 0x6bb79e : 0xb96060).setOrigin(0, 0.5);
        const text = scene.add.text(x, 482, '', {
            fontFamily: 'serif',
            fontSize: '16px',
            color: '#fff8fa'
        }).setOrigin(0.5);
        return { bar, text };
    },

    makeButton(scene, x, y, label, action) {
        const finish = label === '结束战斗';
        return Game.UISkin.makeButton(scene, x, y, label, action, {
            width: finish ? 220 : (label === '撤退' ? 164 : 184),
            height: 76,
            fontSize: finish ? 20 : 22,
            variant: label === '撤退' ? 'secondary' : 'primary',
            stopPropagation: true
        });
    }
};
