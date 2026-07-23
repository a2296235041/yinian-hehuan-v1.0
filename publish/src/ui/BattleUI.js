var Game = window.Game || {};

Game.BattleUI = {
    createFighter(scene, x, label, imageKey, playerSide, stats) {
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
        image.setScale(Math.min(190 / image.width, 250 / image.height));
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
