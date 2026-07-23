var Game = window.Game || {};

/**
 * 在建筑内部放置统一的商店入口，避免把商店绘制逻辑塞进主场景。
 */
Game.ShopEntry = {
    create(scene, building) {
        if (!Game.Data.shops?.[building.id]) return null;
        const button = scene.addViewObject(scene.add.text(500, 58, '灵石商店', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '18px',
            color: '#14231f',
            backgroundColor: '#d8c38c',
            padding: { x: 15, y: 9 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        button.on('pointerdown', () => {
            if (scene.scene.isActive('ShopScene')) return;
            window.GameAudio.sfx('click');
            scene.scene.launch('ShopScene', { buildingId: building.id });
        });
        return button;
    }
};
