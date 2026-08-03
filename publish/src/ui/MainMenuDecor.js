var Game = window.Game || {};

Game.MainMenuDecor = {
    addTitle(scene, width, height) {
        const title = scene.add.text(width / 2, height / 2 - 130, '一念逍遥，一念合欢', {
            fontFamily: '"FZKai-Z03", "STKaiti", "KaiTi", "FangSong", serif',
            fontSize: '56px',
            color: '#fff7ef',
            stroke: '#541d35',
            strokeThickness: 3
        }).setOrigin(0.5).setShadow(0, 6, '#12060d', 0.9, true, true);
        title.setLetterSpacing?.(5);
    },

    addPanel(scene, width, height) {
        const cx = width / 2;
        const top = height / 2 - 200;
        const gold = 0xe4bd79;
        const rose = 0xe88fac;
        const decor = scene.add.graphics();
        decor.lineStyle(1, gold, 0.58);
        decor.strokeCircle(cx, top + 32, 22);
        decor.strokeCircle(cx, top + 32, 16);
        decor.lineBetween(cx - 335, top + 32, cx - 29, top + 32);
        decor.lineBetween(cx + 29, top + 32, cx + 335, top + 32);
        decor.fillStyle(gold, 0.72);
        [cx - 337, cx - 145, cx + 145, cx + 337].forEach((x) => {
            decor.fillTriangle(x, top + 27, x + 5, top + 32, x, top + 37);
        });
        scene.add.text(cx, top + 32, '合欢', {
            fontFamily: '"STKaiti", "KaiTi", serif',
            fontSize: '13px',
            color: '#f4d9a4'
        }).setOrigin(0.5);

        const drawFlower = (x, y, scale, mirror) => {
            decor.fillStyle(rose, 0.58);
            for (let i = 0; i < 5; i += 1) {
                const angle = (Math.PI * 2 * i) / 5;
                decor.fillCircle(
                    x + Math.cos(angle) * 7 * scale * mirror,
                    y + Math.sin(angle) * 7 * scale,
                    4 * scale
                );
            }
            decor.fillStyle(gold, 0.82);
            decor.fillCircle(x, y, 2.5 * scale);
        };
        [-1, 1].forEach((side) => {
            const edgeX = cx + side * 386;
            decor.lineStyle(2, rose, 0.34);
            decor.beginPath();
            decor.moveTo(edgeX, top + 62);
            decor.quadraticBezierTo(cx + side * 348, top + 74, cx + side * 318, top + 111);
            decor.strokePath();
            decor.lineStyle(1, gold, 0.4);
            decor.lineBetween(edgeX, top + 348, cx + side * 350, top + 378);
            decor.lineBetween(cx + side * 350, top + 378, cx + side * 305, top + 378);
            drawFlower(cx + side * 344, top + 82, 0.85, side);
            drawFlower(cx + side * 321, top + 108, 0.6, side);
        });
    },

    addPetals(scene, width, height) {
        for (let i = 0; i < 14; i += 1) {
            const petal = scene.add.ellipse(
                Phaser.Math.Between(24, width - 24),
                Phaser.Math.Between(-height, height),
                Phaser.Math.Between(5, 10),
                Phaser.Math.Between(2, 5),
                i % 3 === 0 ? 0xf6d4dc : 0xe78da9,
                Phaser.Math.FloatBetween(0.24, 0.5)
            ).setRotation(Phaser.Math.FloatBetween(-1, 1));
            scene.tweens.add({
                targets: petal,
                x: petal.x + Phaser.Math.Between(-80, 80),
                y: height + 30,
                rotation: petal.rotation + Phaser.Math.FloatBetween(2, 5),
                duration: Phaser.Math.Between(9000, 16000),
                delay: Phaser.Math.Between(0, 5000),
                repeat: -1
            });
        }
    }
};
