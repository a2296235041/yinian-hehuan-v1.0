var Game = window.Game || {};

// 统一管理 Phaser 场景铺底图与时段光影，避免各场景重复缩放、染色逻辑。
Game.SceneBackdrop = {
    fit(scene, image) {
        const width = scene.cameras.main.width;
        const height = scene.cameras.main.height;
        image.setPosition(width / 2, height / 2);
        image.setScale(Math.max(width / image.width, height / image.height));
    },

    create(scene, textureKey, baseShade) {
        const width = scene.cameras.main.width;
        const height = scene.cameras.main.height;
        const image = scene.addViewObject(scene.add.image(width / 2, height / 2, textureKey));
        const overlay = scene.addViewObject(
            scene.add.rectangle(width / 2, height / 2, width, height, 0x07100d, baseShade)
        );
        const backdrop = { image, overlay, baseShade };
        this.fit(scene, image);
        this.applyPeriod(backdrop);
        return backdrop;
    },

    applyPeriod(backdrop) {
        if (!backdrop?.image?.active || !backdrop?.overlay?.active) return;
        const period = window.GameTime.getSnapshot();
        backdrop.image.setTint(period.tint);
        const alpha = Math.min(0.78, backdrop.baseShade + period.overlayAlpha);
        backdrop.overlay.setFillStyle(period.overlayColor, alpha);
    },

    setTexture(scene, backdrop, textureKey) {
        if (!backdrop?.image?.active || !scene.textures.exists(textureKey)) return;
        backdrop.image.setTexture(textureKey);
        this.fit(scene, backdrop.image);
        this.applyPeriod(backdrop);
    }
};
