var Game = window.Game || {};

/**
 * 在建筑内部放置统一的商店入口，避免把商店绘制逻辑塞进主场景。
 */
Game.ShopEntry = {
    create(scene, building, x = 480) {
        if (!Game.Data.shops?.[building.id]) return null;
        const button = scene.addViewObject(Game.UISkin.makeButton(
            scene, x, 58, '灵石商店', () => {
            if (scene.scene.isActive('ShopScene')) return;
            window.GameAudio.sfx('click');
            scene.scene.launch('ShopScene', { buildingId: building.id });
            }, { width: 150, height: 46, fontSize: 17 }
        ));
        return button;
    }
};
