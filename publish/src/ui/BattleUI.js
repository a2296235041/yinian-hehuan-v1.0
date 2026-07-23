var Game = window.Game || {};

Game.BattleUI = {
    createFighter(scene, x, label, imageKey, playerSide, stats, imageFrame = null) {
        scene.add.text(x, 104, label, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '25px',
            color: playerSide ? '#d8c38c' : '#f0a5a5'
        }).setOrigin(0.5);
        scene.add.text(x, 145, stats, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '14px',
            color: '#cde9df',
            align: 'center',
            lineSpacing: 3
        }).setOrigin(0.5);
        const image = scene.add.image(x, 315, imageKey);
        if (Number.isInteger(imageFrame)) {
            // 每张区域图集为 2×2；按真实纹理尺寸计算，兼容生成图尺寸轻微变化。
            const source = scene.textures.get(imageKey).getSourceImage();
            const cellWidth = source.width / 2;
            const cellHeight = source.height / 2;
            const column = imageFrame % 2;
            const row = Math.floor(imageFrame / 2);
            image.setCrop(column * cellWidth, row * cellHeight, cellWidth, cellHeight);
            image.setScale(Math.min(220 / cellWidth, 270 / cellHeight));
        } else {
            image.setScale(Math.min(190 / image.width, 250 / image.height));
        }
        scene.add.rectangle(x - 150, 458, 300, 18, 0x10201b).setOrigin(0, 0.5);
        const bar = scene.add.rectangle(x - 150, 458, 300, 14,
            playerSide ? 0x6bb79e : 0xb96060).setOrigin(0, 0.5);
        const text = scene.add.text(x, 482, '', {
            fontFamily: 'serif',
            fontSize: '16px',
            color: '#f4ead2'
        }).setOrigin(0.5);
        return { bar, text };
    },

    makeButton(scene, x, y, label, action) {
        return scene.add.text(x, y, label, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '22px',
            color: '#14231f',
            backgroundColor: '#f4ead2',
            padding: { x: 24, y: 11 }
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', action);
    }
};
