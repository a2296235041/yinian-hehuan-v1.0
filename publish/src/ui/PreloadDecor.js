var Game = window.Game || {};

Game.PreloadDecor = {
    create(scene, width, height) {
        const cx = width / 2;
        const cy = height / 2;
        const objects = [];
        const ink = scene.add.graphics();
        objects.push(ink);
        ink.fillStyle(0x08130f, 1);
        ink.fillRect(0, 0, width, height);
        ink.lineStyle(1, 0xb98291, 0.08);
        for (let y = 90; y < height; y += 76) ink.lineBetween(0, y, width, y - 28);
        ink.lineStyle(2, 0xe0b56f, 0.17);
        ink.strokeCircle(cx, cy - 104, 56);
        ink.strokeCircle(cx, cy - 104, 48);

        this.addBranches(scene, width, height, objects);
        this.addPetals(scene, width, height, objects);

        const seal = scene.add.text(cx, cy - 104, '合欢', {
            fontFamily: '"STKaiti", "KaiTi", serif',
            fontSize: '18px',
            color: '#efd29d'
        }).setOrigin(0.5);
        objects.push(seal);
        scene.tweens.add({
            targets: seal,
            alpha: { from: 0.55, to: 1 },
            scale: { from: 0.96, to: 1.04 },
            duration: 1500,
            yoyo: true,
            repeat: -1
        });

        const title = scene.add.text(cx, cy - 32, '正在进入合欢宗', {
            fontFamily: '"STKaiti", "KaiTi", "Noto Serif SC", serif',
            fontSize: '30px',
            color: '#fff5f7',
            stroke: '#35131f',
            strokeThickness: 2
        }).setOrigin(0.5).setShadow(0, 4, '#000000', 0.75);
        title.setLetterSpacing?.(3);
        const subtitle = scene.add.text(cx, cy + 8, '桃花引路 · 灵雾开山', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '14px',
            color: '#dca5b5'
        }).setOrigin(0.5);
        objects.push(title, subtitle);

        const frame = scene.add.graphics();
        frame.fillStyle(0x172821, 0.92);
        frame.fillRoundedRect(cx - 202, cy + 48, 404, 20, 5);
        frame.lineStyle(1, 0xe4b9c5, 0.62);
        frame.strokeRoundedRect(cx - 202, cy + 48, 404, 20, 5);
        frame.lineStyle(1, 0xe0b56f, 0.48);
        frame.lineBetween(cx - 235, cy + 58, cx - 208, cy + 58);
        frame.lineBetween(cx + 208, cy + 58, cx + 235, cy + 58);
        objects.push(frame);
        const bar = scene.add.rectangle(cx - 198, cy + 58, 0, 12, 0xd9577b)
            .setOrigin(0, 0.5);
        const gleam = scene.add.circle(cx - 198, cy + 58, 5, 0xffd9e3, 0);
        const percent = scene.add.text(cx, cy + 92, '0%', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '13px',
            color: '#f1ced7'
        }).setOrigin(0.5);
        objects.push(bar, gleam, percent);

        return {
            update(value) {
                const progress = Phaser.Math.Clamp(value, 0, 1);
                bar.width = 396 * progress;
                gleam.x = cx - 198 + bar.width;
                gleam.setAlpha(progress > 0.02 && progress < 1 ? 0.9 : 0);
                percent.setText(`${Math.round(progress * 100)}%`);
            },
            complete() {
                title.setText('山门已开');
                subtitle.setText('一念入红尘');
                bar.width = 396;
                gleam.setAlpha(0);
                percent.setText('100%');
            }
        };
    },

    addBranches(scene, width, height, objects) {
        const branch = scene.add.graphics();
        objects.push(branch);
        [[0, 1], [width, -1]].forEach(([edge, side]) => {
            branch.lineStyle(5, 0x4b242d, 0.88);
            branch.lineBetween(edge, 30, edge + side * 220, 145);
            branch.lineStyle(2, 0x835061, 0.76);
            branch.lineBetween(edge + side * 88, 77, edge + side * 156, 34);
            branch.lineBetween(edge + side * 132, 100, edge + side * 220, 76);
            branch.lineBetween(edge + side * 165, 116, edge + side * 244, 145);
            [[78, 78], [145, 46], [174, 91], [220, 77], [230, 145]].forEach(([x, y], index) => {
                this.addFlower(scene, edge + side * x, y, 0.72 + index * 0.05, objects);
            });
        });
    },

    addFlower(scene, x, y, scale, objects) {
        const petals = [];
        for (let i = 0; i < 5; i += 1) {
            const angle = (Math.PI * 2 * i) / 5;
            petals.push(scene.add.ellipse(
                Math.cos(angle) * 8, Math.sin(angle) * 8, 11, 7, 0xe996ad, 0.82
            ).setRotation(angle));
        }
        petals.push(scene.add.circle(0, 0, 3, 0xf2cf86, 0.95));
        const flower = scene.add.container(x, y, petals).setScale(scale);
        objects.push(flower);
        scene.tweens.add({
            targets: flower,
            scale: scale * 1.08,
            duration: 1300 + Phaser.Math.Between(0, 700),
            yoyo: true,
            repeat: -1
        });
    },

    addPetals(scene, width, height, objects) {
        for (let i = 0; i < 24; i += 1) {
            const petal = scene.add.ellipse(
                Phaser.Math.Between(16, width - 16),
                Phaser.Math.Between(-height, height),
                Phaser.Math.Between(5, 12),
                Phaser.Math.Between(2, 6),
                i % 4 === 0 ? 0xf8dce4 : 0xe78da9,
                Phaser.Math.FloatBetween(0.25, 0.68)
            ).setRotation(Phaser.Math.FloatBetween(-1, 1));
            objects.push(petal);
            scene.tweens.add({
                targets: petal,
                x: petal.x + Phaser.Math.Between(-120, 120),
                y: height + 24,
                rotation: petal.rotation + Phaser.Math.FloatBetween(3, 7),
                duration: Phaser.Math.Between(7000, 14000),
                delay: Phaser.Math.Between(0, 3500),
                repeat: -1
            });
        }
    }
};
