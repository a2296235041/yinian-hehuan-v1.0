var Game = window.Game || {};

/**
 * NPC 卡片集中在独立渲染器中维护，GameScene 只负责场景切换。
 * 卡片高度固定，角色图、身份、境界和好感不会因文字变化互相遮挡。
 */
Game.NpcCardRenderer = {
    portraitPath(npcId) {
        if (npcId === 'su_meier') return './assets/generated/npc-su-meier.png';
        if (npcId === 'liu_hanyan') return './assets/generated/npc-liu-hanyan.png';
        if (npcId === 'han_yueshuang') return './assets/generated/npc-han-yueshuang.png';
        if (npcId === 'hu_jiuer') return './assets/generated/npc-hu-jiuer.png';
        if (npcId === 'yun_shuiyao') return './assets/generated/npc-yun-shuiyao.png';
        if (npcId === 'xiao_qingxuan') {
            return './assets/generated/sect-master.b9883f28.webp';
        }
        return './assets/generated/scholar-disciple.e2aa08f6.webp';
    },

    portraitKey(npcId) {
        if (npcId === 'su_meier') return 'npc-su-meier';
        if (npcId === 'liu_hanyan') return 'npc-liu-hanyan';
        if (npcId === 'han_yueshuang') return 'npc-han-yueshuang';
        if (npcId === 'hu_jiuer') return 'npc-hu-jiuer';
        if (npcId === 'yun_shuiyao') return 'npc-yun-shuiyao';
        if (npcId === 'xiao_qingxuan') {
            return 'npc-master';
        }
        return 'npc-scholar';
    },

    create(scene, npc, x) {
        const affinity = scene.npcSystem.getNpcStateById(npc.id);
        const frame = scene.addViewObject(scene.add.rectangle(x, 375, 226, 430, 0x0d1b17, 0.9)
            .setStrokeStyle(2, 0xd8c38c, 0.75));
        const portrait = scene.addViewObject(scene.add.image(x, 325, this.portraitKey(npc.id)));
        portrait.setScale(Math.min(165 / portrait.width, 235 / portrait.height));
        scene.addViewObject(scene.add.text(x, 478, npc.name, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '24px',
            color: '#f4ead2'
        }).setOrigin(0.5));
        scene.addViewObject(scene.add.text(x, 512, npc.title, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#d8c38c'
        }).setOrigin(0.5));
        scene.addViewObject(scene.add.text(x, 540, `境界 ${npc.realm_label}`, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '15px',
            color: '#e6cf8f'
        }).setOrigin(0.5));
        const affinityText = scene.addViewObject(scene.add.text(
            x, 572, `好感 ${affinity.affinity} · 点击交谈`, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#cde9df'
        }).setOrigin(0.5));
        const updateAffinity = (data) => {
            if (data.npcId === npc.id) {
                affinityText.setText(`好感 ${data.affinity} · 点击交谈`);
            }
        };
        Game.EventBus.on('affinity-changed', updateAffinity);
        affinityText.once(Phaser.GameObjects.Events.DESTROY, () => {
            Game.EventBus.off('affinity-changed', updateAffinity);
        });
        const hitArea = scene.addViewObject(
            scene.add.zone(x, 375, 226, 430).setInteractive({ useHandCursor: true })
        );
        hitArea.on('pointerdown', () => {
            window.GameAudio.sfx('click');
            scene.tweens.add({ targets: frame, alpha: 0.55, duration: 80, yoyo: true });
            scene.dialogueSystem.startDialogue(npc.id);
        });
    }
};
