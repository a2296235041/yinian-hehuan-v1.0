var Game = window.Game || {};

/**
 * NPC 立绘集中在独立渲染器中维护，角色本体就是交互入口。
 * 不绘制卡片框，按建筑背景和人物身份给出稳定站位。
 */
Game.NpcCardRenderer = {
    layouts: {
        su_meier: { x: 390, groundY: 590, height: 480 },
        liu_hanyan: { x: 820, groundY: 590, height: 470 },
        han_yueshuang: { x: 390, groundY: 590, height: 450 },
        xiao_qingxuan: { x: 890, groundY: 590, height: 450 },
        yun_shuiyao: { x: 760, groundY: 590, height: 440 },
        qin_wanqing: { x: 390, groundY: 590, height: 450 },
        mo_qiaoer: { x: 870, groundY: 590, height: 430 },
        bai_zhi: { x: 390, groundY: 590, height: 450 },
        hu_jiuer: { x: 890, groundY: 590, height: 470 }
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
        if (npcId === 'hu_jiuer') return './assets/generated/npc-hu-jiuer.png';
        if (npcId === 'yun_shuiyao') {
            return './assets/generated/npc-standee-yun-shuiyao.38bab51c.webp';
        }
        if (npcId === 'mo_qiaoer') return './assets/generated/npc-mo-qiaoer.png';
        if (npcId === 'bai_zhi') return './assets/generated/npc-bai-zhi.png';
        if (npcId === 'qin_wanqing') return './assets/generated/npc-qin-wanqing.png';
        if (npcId === 'xiao_qingxuan') {
            return './assets/generated/npc-xiao-qingxuan.png';
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

    create(scene, npc, x) {
        const layout = this.layouts[npc.id] || { x, groundY: 590, height: 440 };
        const affinity = scene.npcSystem.getNpcStateById(npc.id);
        const portrait = scene.addViewObject(scene.add.image(
            layout.x, layout.groundY, this.portraitKey(npc.id)
        ).setOrigin(0.5, 1));
        const scale = layout.height / portrait.height;
        portrait.setScale(scale).setDepth(4).setInteractive({ useHandCursor: true });
        const nameText = scene.addViewObject(scene.add.text(layout.x, layout.groundY + 4, npc.name, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#f4ead2',
            stroke: '#14231f',
            strokeThickness: 3
        }).setOrigin(0.5, 0));
        scene.addViewObject(scene.add.text(layout.x, layout.groundY + 31, npc.title, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#d8c38c'
        }).setOrigin(0.5, 0));
        const affinityText = scene.addViewObject(scene.add.text(
            layout.x, layout.groundY + 53, `好感 ${affinity.affinity} · 点击交谈`, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '14px',
            color: '#cde9df',
            stroke: '#14231f',
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
