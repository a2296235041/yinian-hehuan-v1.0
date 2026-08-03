var Game = window.Game || {};

Game.SectMapDecor = {
    add(scene, buildings) {
        try {
            this.addTitleOrnament(scene);
            this.addMist(scene);
            this.addPetals(scene);
            this.addSpiritLights(scene);
            this.addBuildingAuras(scene, buildings || []);
        } catch (error) {
            console.error('山门地图装饰渲染失败:', error.message, error.stack);
        }
    },

    addTitleOrnament(scene) {
        const ornament = scene.addViewObject(scene.add.graphics());
        ornament.lineStyle(1, 0xe5bd78, 0.62);
        ornament.lineBetween(408, 38, 500, 38);
        ornament.lineBetween(780, 38, 872, 38);
        ornament.lineStyle(1, 0xf0a8bb, 0.42);
        ornament.lineBetween(432, 44, 514, 44);
        ornament.lineBetween(766, 44, 848, 44);
        ornament.fillStyle(0xe5bd78, 0.78);
        [402, 500, 775, 873].forEach((x) => {
            ornament.fillTriangle(x, 33, x + 5, 38, x, 43);
        });
        ornament.strokeCircle(640, 38, 27);
        ornament.strokeCircle(640, 38, 22);
    },

    addMist(scene) {
        const layers = [
            [-250, 172, 480, 54, 21000, 0.035],
            [320, 365, 560, 68, 26000, 0.045],
            [960, 555, 430, 50, 23000, 0.04]
        ];
        layers.forEach(([x, y, width, height, duration, alpha], index) => {
            const mist = scene.addViewObject(
                scene.add.ellipse(x, y, width, height, 0xf7eee7, alpha)
            );
            this.trackTween(scene, mist, {
                x: index === 2 ? -320 : 1600,
                duration,
                repeat: -1
            });
        });
    },

    addPetals(scene) {
        for (let i = 0; i < 18; i += 1) {
            const petal = scene.addViewObject(scene.add.ellipse(
                Phaser.Math.Between(20, 1260),
                Phaser.Math.Between(-720, 700),
                Phaser.Math.Between(5, 11),
                Phaser.Math.Between(2, 5),
                i % 4 === 0 ? 0xf9dce5 : 0xe990aa,
                Phaser.Math.FloatBetween(0.18, 0.48)
            ).setRotation(Phaser.Math.FloatBetween(-1, 1)));
            this.trackTween(scene, petal, {
                x: petal.x + Phaser.Math.Between(-100, 100),
                y: 748,
                rotation: petal.rotation + Phaser.Math.FloatBetween(3, 7),
                duration: Phaser.Math.Between(8500, 15000),
                delay: Phaser.Math.Between(0, 4500),
                repeat: -1
            });
        }
    },

    addSpiritLights(scene) {
        const positions = [
            [365, 332], [494, 295], [707, 334], [830, 298],
            [345, 576], [516, 548], [770, 564], [925, 518]
        ];
        positions.forEach(([x, y], index) => {
            const light = scene.addViewObject(
                scene.add.circle(x, y, index % 3 === 0 ? 2.4 : 1.7, 0xf2d38c, 0.38)
            );
            this.trackTween(scene, light, {
                y: y - Phaser.Math.Between(8, 18),
                alpha: { from: 0.18, to: 0.76 },
                duration: 1200 + index * 130,
                yoyo: true,
                repeat: -1
            });
        });
    },

    addBuildingAuras(scene, buildings) {
        buildings.forEach((building, index) => {
            const aura = scene.addViewObject(
                scene.add.ellipse(building.mapX, building.mapY + 30, 238, 172, 0x2d1722, 0)
                    .setStrokeStyle(1, index % 2 === 0 ? 0xe8b4c3 : 0xe4bd79, 0.24)
            );
            this.trackTween(scene, aura, {
                scaleX: 1.045,
                scaleY: 1.045,
                alpha: { from: 0.45, to: 0.9 },
                duration: 1800 + index * 170,
                yoyo: true,
                repeat: -1
            });
        });
    },

    trackTween(scene, target, config) {
        const tween = scene.tweens.add({ targets: target, ...config });
        scene.addViewObject({
            destroy() {
                tween.stop?.();
                scene.tweens.remove?.(tween);
            }
        });
    }
};
