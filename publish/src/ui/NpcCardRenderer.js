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
            return './assets/generated/npc-standee-su-meier.a9f08237.v070.webp';
        }
        if (npcId === 'liu_hanyan') {
            return './assets/generated/npc-standee-liu-hanyan.340893ff.v070.webp';
        }
        if (npcId === 'han_yueshuang') {
            return './assets/generated/npc-standee-han-yueshuang.352ae25d.v070.webp';
        }
        if (npcId === 'hu_jiuer') {
            return './assets/generated/npc-standee-hu-jiuer.a10661ad.v070.webp';
        }
        if (npcId === 'yun_shuiyao') {
            return './assets/generated/npc-standee-yun-shuiyao.38bab51c.v070.webp';
        }
        if (npcId === 'mo_qiaoer') {
            return './assets/generated/npc-standee-mo-qiaoer.64f6011d.v070.webp';
        }
        if (npcId === 'bai_zhi') {
            return './assets/generated/npc-standee-bai-zhi.79c8c1df.v070.webp';
        }
        if (npcId === 'qin_wanqing') {
            return './assets/generated/npc-standee-qin-wanqing.f515aa6e.v070.webp';
        }
        if (npcId === 'xiao_qingxuan') {
            return './assets/generated/npc-standee-xiao-qingxuan.7a93f059.v070.webp';
        }
        if (npcId === 'shen_yuzhi') {
            return './assets/generated/npc-standee-shen-yuzhi.c1c8214b.v071.png';
        }
        if (npcId === 'lu_qianxue') {
            return './assets/generated/npc-standee-lu-qianxue.c3166763.v071.png';
        }
        if (npcId === 'tang_miaoyin') {
            return './assets/generated/npc-standee-tang-miaoyin.e1f1a9be.v071.png';
        }
        if (npcId === 'pei_zhaoying') {
            return './assets/generated/npc-standee-pei-zhaoying.5a0aa77e.v071.png';
        }
        if (npcId === 'gu_qingluo') {
            return './assets/generated/npc-standee-gu-qingluo.0b001be5.v071.png';
        }
        if (npcId === 'jiang_yechun') {
            return './assets/generated/npc-standee-jiang-yechun.4ff3d3a8.v071.png';
        }
        if (npcId === 'ning_feixing') {
            return './assets/generated/npc-standee-ning-feixing.173d4662.v071.png';
        }
        if (npcId === 'wen_yaosu') {
            return './assets/generated/npc-standee-wen-yaosu.667562ad.v071.png';
        }
        if (npcId === 'luo_feihong') {
            return './assets/generated/npc-standee-luo-feihong.62eb13f5.v071.png';
        }
        if (npcId === 'ji_mingzhu') {
            return './assets/generated/npc-standee-ji-mingzhu.c8c0d813.v071.png';
        }
        if (npcId === 'yue_tinglan') {
            return './assets/generated/npc-standee-yue-tinglan.5376b0e9.v071.png';
        }
        if (npcId === 'shangguan_zhiyin') {
            return './assets/generated/npc-standee-shangguan-zhiyin.e3930001.v071.png';
        }
        if (npcId === 'su_qingque') {
            return './assets/generated/npc-standee-su-qingque.e51229af.v071.png';
        }
        if (npcId === 'jiang_zhaoyue') {
            return './assets/generated/npc-standee-jiang-zhaoyue.7495384c.v071.png';
        }
        if (npcId === 'gu_yunzheng') {
            return './assets/generated/npc-standee-gu-yunzheng.14102b9d.v071.png';
        }
        if (npcId === 'shen_jingchen') {
            return './assets/generated/npc-standee-shen-jingchen.77ae0aa7.v071.png';
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
            scene.load.image(
                key,
                Game.AssetUrl.withVersion(this.portraitPath(npc.id))
            );
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
        if (npc.id === 'su_meier') {
            Game.TutorialAnchors?.set?.('su-meier', portrait);
        }
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
