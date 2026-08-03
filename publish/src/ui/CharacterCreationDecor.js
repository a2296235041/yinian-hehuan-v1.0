var Game = window.Game || {};

Game.CharacterCreationDecor = {
    create(scene, width, height) {
        try {
            this.addBackdrop(scene, width, height);
        } catch (error) {
            console.error('身份页背景装饰失败:', error.message, error.stack);
        }
        return () => {
            try {
                this.addPanelDecor(scene, width, height);
            } catch (error) {
                console.error('身份页面板装饰失败:', error.message, error.stack);
            }
        };
    },

    addBackdrop(scene, width, height) {
        const mist = scene.add.graphics();
        mist.lineStyle(1, 0xf1b7c7, 0.11);
        for (let y = 120; y < height; y += 92) {
            mist.lineBetween(0, y, width, y - 34);
        }
        for (let i = 0; i < 16; i += 1) {
            const petal = scene.add.ellipse(
                Phaser.Math.Between(18, width - 18),
                Phaser.Math.Between(-height, height),
                Phaser.Math.Between(5, 11),
                Phaser.Math.Between(2, 5),
                i % 4 === 0 ? 0xf9dce5 : 0xe98da9,
                Phaser.Math.FloatBetween(0.2, 0.48)
            ).setRotation(Phaser.Math.FloatBetween(-1, 1));
            scene.tweens.add({
                targets: petal,
                x: petal.x + Phaser.Math.Between(-90, 90),
                y: height + 24,
                rotation: petal.rotation + Phaser.Math.FloatBetween(3, 6),
                duration: Phaser.Math.Between(9000, 15000),
                delay: Phaser.Math.Between(0, 4000),
                repeat: -1
            });
        }
    },

    addPanelDecor(scene, width, height) {
        const cx = width / 2;
        const panelTop = height / 2 - 258;
        const panelBottom = height / 2 + 282;
        const gold = 0xe2ba73;
        const rose = 0xe78ca8;
        const lines = scene.add.graphics();
        lines.lineStyle(1, gold, 0.5);
        lines.lineBetween(cx - 410, panelTop + 18, cx - 92, panelTop + 18);
        lines.lineBetween(cx + 92, panelTop + 18, cx + 410, panelTop + 18);
        lines.strokeCircle(cx, panelTop + 18, 22);
        lines.strokeCircle(cx, panelTop + 18, 16);
        lines.lineStyle(1, rose, 0.35);
        lines.lineBetween(cx - 455, panelTop + 62, cx - 455, panelBottom - 52);
        lines.lineBetween(cx + 455, panelTop + 62, cx + 455, panelBottom - 52);
        lines.lineStyle(1, gold, 0.42);
        lines.lineBetween(cx - 168, height / 2 + 76, cx - 88, height / 2 + 76);
        lines.lineBetween(cx + 88, height / 2 + 76, cx + 168, height / 2 + 76);
        lines.fillStyle(gold, 0.75);
        [cx - 174, cx + 174].forEach((x) => {
            lines.fillTriangle(x, height / 2 + 71, x + 5, height / 2 + 76, x, height / 2 + 81);
        });
        scene.add.text(cx, panelTop + 18, '缘', {
            fontFamily: '"STKaiti", "KaiTi", serif',
            fontSize: '15px',
            color: '#efd39c'
        }).setOrigin(0.5);

        this.addPortraitHalo(scene, width, height);
        this.addCornerFlowers(scene, width, height);
        this.addSidePetals(scene, width, height);
    },

    addPortraitHalo(scene, width, height) {
        const x = width - 320;
        const y = height - 280;
        const halo = scene.add.graphics();
        halo.fillStyle(0xe8b5c3, 0.055);
        halo.fillCircle(x, y, 118);
        halo.lineStyle(1, 0xe7bf7c, 0.24);
        halo.strokeCircle(x, y, 118);
        halo.strokeCircle(x, y, 104);
        halo.lineStyle(2, 0xe497ad, 0.32);
        halo.lineBetween(x - 92, height - 103, x + 92, height - 103);
        for (let i = -3; i <= 3; i += 1) {
            halo.strokeEllipse(x + i * 22, height - 109, 48, 18);
        }
        scene.tweens.add({
            targets: halo,
            alpha: { from: 0.72, to: 1 },
            duration: 1800,
            yoyo: true,
            repeat: -1
        });
    },

    addCornerFlowers(scene, width, height) {
        const points = [
            [182, 130, 0.8], [218, 151, 0.55],
            [width - 182, 130, 0.8], [width - 218, 151, 0.55],
            [182, height - 132, 0.65], [width - 182, height - 132, 0.65]
        ];
        points.forEach(([x, y, scale], index) => {
            const petals = [];
            for (let i = 0; i < 5; i += 1) {
                const angle = (Math.PI * 2 * i) / 5;
                petals.push(scene.add.ellipse(
                    Math.cos(angle) * 7, Math.sin(angle) * 7, 10, 6, 0xe998af, 0.72
                ).setRotation(angle));
            }
            petals.push(scene.add.circle(0, 0, 2.5, 0xf0ce83, 0.92));
            const flower = scene.add.container(x, y, petals).setScale(scale);
            scene.tweens.add({
                targets: flower,
                scale: scale * 1.08,
                duration: 1400 + index * 170,
                yoyo: true,
                repeat: -1
            });
        });
    },

    addSidePetals(scene, width, height) {
        for (let i = 0; i < 10; i += 1) {
            const leftSide = i % 2 === 0;
            const petal = scene.add.ellipse(
                leftSide ? Phaser.Math.Between(176, 232) : Phaser.Math.Between(width - 232, width - 176),
                Phaser.Math.Between(120, height - 120),
                Phaser.Math.Between(5, 9),
                Phaser.Math.Between(2, 4),
                0xf0a6b9,
                Phaser.Math.FloatBetween(0.28, 0.55)
            ).setRotation(Phaser.Math.FloatBetween(-1, 1));
            scene.tweens.add({
                targets: petal,
                x: petal.x + Phaser.Math.Between(-28, 28),
                y: height - 105,
                rotation: petal.rotation + Phaser.Math.FloatBetween(2, 4),
                duration: Phaser.Math.Between(5000, 9000),
                delay: Phaser.Math.Between(0, 2400),
                repeat: -1
            });
        }
    }
};
