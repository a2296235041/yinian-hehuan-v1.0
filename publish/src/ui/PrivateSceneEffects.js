var Game = window.Game || {};

Game.PrivateSceneEffects = {
    createLayer(scene) {
        scene.privateEffectState = {
            layer: scene.add.container(0, 0),
            tweens: []
        };
    },
    apply(scene, textureKey) {
        this.clear(scene);
        const effect = {
            'bg-private-cave': 'cave',
            'bg-private-bamboo': 'bamboo',
            'bg-private-hot-spring': 'spring',
            'bg-private-flower-terrace': 'flower',
            'bg-private-moon-pavilion': 'moon',
            'bg-private-spirit-garden': 'garden'
        }[textureKey];
        if (effect && this[effect]) this[effect](scene);
    },
    clear(scene) {
        const state = scene.privateEffectState;
        if (!state) return;
        state.tweens.forEach((tween) => {
            tween.stop?.();
            scene.tweens.remove?.(tween);
        });
        state.tweens = [];
        state.layer.removeAll(true);
    },
    destroy(scene) {
        const state = scene.privateEffectState;
        if (!state) return;
        this.clear(scene);
        state.layer.destroy(true);
        scene.privateEffectState = null;
    },
    add(scene, object) {
        scene.privateEffectState?.layer.add(object);
        return object;
    },
    tween(scene, target, config) {
        const tween = scene.tweens.add({ targets: target, ...config });
        scene.privateEffectState?.tweens.push(tween);
    },
    addDrifters(scene, config) {
        const colors = config.colors || [0xffffff];
        for (let i = 0; i < config.count; i += 1) {
            const x = Phaser.Math.Between(config.x[0], config.x[1]);
            const y = Phaser.Math.Between(config.y[0], config.y[1]);
            const alpha = Phaser.Math.FloatBetween(config.alpha[0], config.alpha[1]);
            const size = Phaser.Math.Between(config.size[0], config.size[1]);
            const object = config.circle
                ? scene.add.circle(x, y, size, colors[i % colors.length], alpha)
                : scene.add.ellipse(
                    x, y, size, Phaser.Math.Between(config.height[0], config.height[1]),
                    colors[i % colors.length], alpha
                ).setRotation(Phaser.Math.FloatBetween(-1, 1));
            this.add(scene, object);
            this.tween(scene, object, {
                x: x + Phaser.Math.Between(config.dx[0], config.dx[1]),
                y: y + Phaser.Math.Between(config.dy[0], config.dy[1]),
                rotation: object.rotation + Phaser.Math.FloatBetween(2, config.spin || 5),
                alpha: config.fadeTo === undefined ? alpha : config.fadeTo,
                duration: Phaser.Math.Between(config.duration[0], config.duration[1]),
                delay: Phaser.Math.Between(0, config.delay || 1800),
                yoyo: config.yoyo === true,
                repeat: -1
            });
        }
    },
    addRipples(scene, count, color, yRange) {
        for (let i = 0; i < count; i += 1) {
            const ripple = this.add(scene, scene.add.ellipse(
                Phaser.Math.Between(250, 1030),
                Phaser.Math.Between(yRange[0], yRange[1]),
                Phaser.Math.Between(75, 145), 18, color, 0
            ).setStrokeStyle(1, color, 0.22));
            this.tween(scene, ripple, {
                scaleX: 1.28,
                scaleY: 1.12,
                alpha: 0,
                duration: 3200 + i * 450,
                delay: i * 700,
                repeat: -1
            });
        }
    },

    cave(scene) {
        this.addDrifters(scene, {
            count: 8, circle: true, colors: [0x9edbc8, 0xc9eadc],
            x: [100, 1180], y: [230, 640], size: [1, 3], alpha: [0.12, 0.32],
            dx: [-10, 10], dy: [-28, -12], duration: [2800, 4600],
            fadeTo: 0.48, yoyo: true
        });
        this.addRipples(scene, 2, 0x83c7bd, [560, 640]);
    },

    bamboo(scene) {
        this.addDrifters(scene, {
            count: 10, colors: [0x98ad72, 0xc3b879], x: [30, 1100], y: [-80, 600],
            size: [10, 18], height: [3, 5], alpha: [0.2, 0.42],
            dx: [80, 150], dy: [170, 250], duration: [7000, 11000], spin: 7
        });
    },

    spring(scene) {
        this.addDrifters(scene, {
            count: 7, colors: [0xf2f4ef, 0xddece8], x: [250, 1040], y: [460, 680],
            size: [28, 52], height: [75, 125], alpha: [0.025, 0.065],
            dx: [-25, 25], dy: [-170, -110], duration: [5200, 8200], fadeTo: 0
        });
        this.addRipples(scene, 4, 0xbadfd9, [535, 640]);
    },

    flower(scene) {
        this.addDrifters(scene, {
            count: 13, colors: [0xf0a8bb, 0xd5b3e6, 0xf8dce5], x: [30, 1240], y: [-80, 650],
            size: [6, 12], height: [2, 5], alpha: [0.22, 0.5],
            dx: [-70, 70], dy: [110, 190], duration: [7000, 11500], spin: 8
        });
    },

    moon(scene) {
        this.addDrifters(scene, {
            count: 8, circle: true, colors: [0xdceaff, 0xb9d6ef],
            x: [120, 1160], y: [140, 570], size: [1, 2], alpha: [0.18, 0.42],
            dx: [-6, 6], dy: [-16, -5], duration: [2200, 4200],
            fadeTo: 0.7, yoyo: true
        });
        this.addRipples(scene, 3, 0xb7d8f3, [540, 635]);
    },

    garden(scene) {
        this.addDrifters(scene, {
            count: 10, circle: true, colors: [0xd8df7b, 0x9edb8f],
            x: [100, 1180], y: [250, 640], size: [1, 3], alpha: [0.2, 0.48],
            dx: [-14, 14], dy: [-24, 8], duration: [2300, 4300],
            fadeTo: 0.72, yoyo: true
        });
        this.addDrifters(scene, {
            count: 5, colors: [0x8ba76e, 0xb4bd7d], x: [40, 1200], y: [100, 620],
            size: [8, 14], height: [3, 5], alpha: [0.16, 0.32],
            dx: [35, 80], dy: [80, 150], duration: [6500, 9500], spin: 6
        });
    }
};
