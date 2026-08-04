var Game = window.Game || {};

/**
 * NPC 立绘集中在独立渲染器中维护，角色本体就是交互入口。
 * 不绘制卡片框，按建筑背景和人物身份给出稳定站位。
 */
Game.NpcCardRenderer = {
    pending: new Map(),
    layouts: {
        su_meier: { x: 320, groundY: 590, height: 400 },
        liu_hanyan: { x: 820, groundY: 580, height: 400 },
        han_yueshuang: { x: 350, groundY: 590, height: 395 },
        xiao_qingxuan: { x: 930, groundY: 575, height: 360 },
        yun_shuiyao: { x: 350, groundY: 590, height: 380 },
        qin_wanqing: { x: 330, groundY: 600, height: 400 },
        mo_qiaoer: { x: 950, groundY: 570, height: 330 },
        bai_zhi: { x: 310, groundY: 600, height: 390 },
        hu_jiuer: { x: 950, groundY: 575, height: 400 }
    },

    portraitPath(npcId) {
        if (npcId === 'su_meier') {
            return './assets/generated/npc-standee-su-meier.a9f08237.webp';
        }
        if (npcId === 'liu_hanyan') {
            return './assets/generated/npc-standee-liu-hanyan.340893ff.webp';
        }
        if (npcId === 'han_yueshuang') {
            return './assets/generated/npc-standee-han-yueshuang.352ae25d.webp';
        }
        if (npcId === 'hu_jiuer') {
            return './assets/generated/npc-standee-hu-jiuer.a10661ad.webp';
        }
        if (npcId === 'yun_shuiyao') {
            return './assets/generated/npc-standee-yun-shuiyao.38bab51c.webp';
        }
        if (npcId === 'mo_qiaoer') {
            return './assets/generated/npc-standee-mo-qiaoer.webp';
        }
        if (npcId === 'bai_zhi') {
            return './assets/generated/npc-standee-bai-zhi.79c8c1df.webp';
        }
        if (npcId === 'qin_wanqing') {
            return './assets/generated/npc-standee-qin-wanqing.f515aa6e.webp';
        }
        if (npcId === 'xiao_qingxuan') {
            return './assets/generated/npc-standee-xiao-qingxuan.7a93f059.webp';
        }
        return './assets/generated/scholar-disciple.e2aa08f6.webp';
    },

    portraitKey(npcId) {
        if (npcId === 'su_meier') return 'npc-su-meier';
        if (npcId === 'liu_hanyan') return 'npc-liu-hanyan';
        if (npcId === 'han_yueshuang') return 'npc-han-yueshuang';
        if (npcId === 'hu_jiuer') return 'npc-hu-jiuer';
        if (npcId === 'yun_shuiyao') return 'npc-yun-shuiyao';
        if (npcId === 'mo_qiaoer') return 'npc-mo-qiaoer';
        if (npcId === 'bai_zhi') return 'npc-bai-zhi';
        if (npcId === 'qin_wanqing') return 'npc-qin-wanqing';
        if (npcId === 'xiao_qingxuan') {
            return 'npc-xiao-qingxuan';
        }
        return 'npc-scholar';
    },

    ensurePortrait(scene, npc) {
        const key = this.portraitKey(npc.id);
        if (scene.textures.exists(key)) return Promise.resolve(key);
        if (this.pending.has(key)) return this.pending.get(key);
        const task = new Promise((resolve, reject) => {
            const complete = `filecomplete-image-${key}`;
            const cleanup = () => {
                scene.load.off(complete, onComplete);
                scene.load.off('loaderror', onError);
            };
            const onComplete = () => {
                cleanup();
                resolve(key);
            };
            const onError = (file) => {
                if (file?.key !== key) return;
                cleanup();
                reject(new Error(`NPC立绘加载失败：${npc.name}`));
            };
            scene.load.once(complete, onComplete);
            scene.load.on('loaderror', onError);
            scene.load.image(key, this.portraitPath(npc.id));
            if (!scene.load.isLoading()) scene.load.start();
        }).finally(() => this.pending.delete(key));
        this.pending.set(key, task);
        return task;
    },

    create(scene, npc, x) {
        const layout = this.layouts[npc.id] || { x, groundY: 590, height: 440 };
        const portraitKey = this.portraitKey(npc.id);
        if (!scene.textures.exists(portraitKey)) {
            const loading = scene.addViewObject(scene.add.text(
                layout.x, layout.groundY - 180, `${npc.name}\n立绘加载中…`, {
                    fontFamily: '"Noto Serif SC", serif',
                    fontSize: '18px',
                    color: '#fff8fa',
                    align: 'center'
                }
            ).setOrigin(0.5));
            this.ensurePortrait(scene, npc).then(() => {
                if (!loading.active || !scene.currentBuilding?.npcIds?.includes(npc.id)) return;
                loading.destroy();
                this.create(scene, npc, x);
            }).catch((error) => {
                console.error('NPC立绘加载失败:', error.message, error.stack);
                if (loading.active) loading.setText(`${npc.name}\n立绘暂不可用`);
            });
            return loading;
        }
        const affinity = scene.npcSystem.getNpcStateById(npc.id);
        const portrait = scene.addViewObject(scene.add.image(
            layout.x, layout.groundY, portraitKey
        ).setOrigin(0.5, 1));
        const scale = layout.height / portrait.height;
        portrait.setScale(scale).setDepth(4).setInteractive({ useHandCursor: true });
        const nameText = scene.addViewObject(scene.add.text(layout.x, layout.groundY + 4, npc.name, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#fff8fa',
            stroke: '#321522',
            strokeThickness: 3
        }).setOrigin(0.5, 0));
        scene.addViewObject(scene.add.text(layout.x, layout.groundY + 31, npc.title, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#f0a8bb'
        }).setOrigin(0.5, 0));
        const affinityText = scene.addViewObject(scene.add.text(
            layout.x, layout.groundY + 53, `好感 ${affinity.affinity} · 点击交谈`, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '14px',
            color: '#ffe8ee',
            stroke: '#321522',
            strokeThickness: 2
        }).setOrigin(0.5, 0));
        const updateAffinity = (data) => {
            if (data.npcId === npc.id) {
                affinityText.setText(`好感 ${data.affinity} · 点击交谈`);
            }
        };
        Game.EventBus.on('affinity-changed', updateAffinity);
        affinityText.once(Phaser.GameObjects.Events.DESTROY, () => {
            Game.EventBus.off('affinity-changed', updateAffinity);
        });
        portrait.on('pointerover', () => {
            scene.tweens.add({ targets: portrait, scale: scale * 1.03, duration: 100 });
        });
        portrait.on('pointerout', () => {
            scene.tweens.add({ targets: portrait, scale, duration: 100 });
        });
        portrait.on('pointerdown', () => {
            window.GameAudio.sfx('click');
            scene.tweens.add({ targets: portrait, scale: scale * 0.98, duration: 70, yoyo: true });
            scene.dialogueSystem.startDialogue(npc.id);
        });
    }
};
