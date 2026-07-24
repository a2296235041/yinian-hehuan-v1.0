var Game = window.Game || {};
Game.ExplorationView = {
    wrap(text, maxChars = 54, maxLines = 4) {
        return Game.TextBoxUtils.fit(text, maxChars, maxLines);
    },
    create(scene, onClose) {
        const background = scene.add.image(640, 360, 'bg-sect-map')
            .setDisplaySize(1280, 720);
        scene.add.rectangle(640, 360, 1280, 720, 0x06100d, 0.58)
            .setInteractive();
        const title = scene.add.text(640, 42, '出山探险', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '36px',
            color: '#f4ead2',
            stroke: '#14231f',
            strokeThickness: 3
        }).setOrigin(0.5);
        Game.UISkin.addPanel(scene, 178, 78, 320, 120, 'wide', { alpha: 0.92 });
        const playerInfo = scene.add.text(32, 29, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '14px',
            color: '#f4ead2',
            lineSpacing: 5
        });
        Game.UISkin.makeButton(scene, 1185, 46, '返回宗门', onClose, {
            width: 150, height: 46, fontSize: 17, variant: 'secondary'
        });
        const statusPanel = Game.UISkin.addPanel(
            scene, 640, 520, 1080, 118, 'wide', { alpha: 0.96 }
        ).setVisible(false);
        const status = scene.add.text(640, 520, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '18px',
            color: '#f4ead2',
            padding: { x: 18, y: 10 },
            align: 'center',
            wordWrap: { width: 1010, useAdvancedWrap: true },
            fixedWidth: 1050,
            fixedHeight: 108
        }).setOrigin(0.5).setVisible(false);
        return {
            background,
            title,
            playerInfo,
            status,
            statusPanel,
            regionObjects: [],
            detailObjects: []
        };
    },
    clear(list) {
        list.forEach((object) => object.destroy());
        list.length = 0;
    },
    setBackground(scene, view, textureKey) {
        if (!scene.textures.exists(textureKey)) return;
        view.background.setTexture(textureKey).setDisplaySize(1280, 720);
    },
    setStatus(view, text, visible = true) {
        view.status.setText(this.wrap(text, 50, 4)).setVisible(visible);
        view.statusPanel.setVisible(visible);
    },
    updatePlayerInfo(view) {
        const stats = window.GamePlayerStats.getSnapshot();
        const player = Game.player;
        view.playerInfo.setText(
            `${stats.originName}　${stats.realmLabel}\n` +
            `精力 ${player.stamina}/${player.maxStamina}　气血 ${stats.maxHp}　攻击 ${stats.attack}\n` +
            `力量 ${stats.strength}　根骨 ${stats.constitution}　身法 ${stats.agility}\n` +
            `神识 ${stats.intelligence}　悟性 ${stats.wisdom}　气运 ${stats.luck}`
        );
    },
    showRegions(scene, view, regions, onSelect) {
        this.clear(view.detailObjects);
        this.clear(view.regionObjects);
        view.title.setText('出山探险');
        view.status.setVisible(false);
        view.statusPanel.setVisible(false);
        regions.forEach((region, index) => {
            const x = 175 + (index % 4) * 310;
            const y = 260 + Math.floor(index / 4) * 255;
            const frame = Game.UISkin.addPanel(scene, x, y, 270, 230, 'card', {
                alpha: region.unlocked ? 0.92 : 0.48
            });
            const title = scene.add.text(x, y - 82, region.name, {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '23px',
                color: region.unlocked ? '#f4ead2' : '#789087'
            }).setOrigin(0.5);
            const requirement = region.unlocked
                ? `险度 ${region.danger} · 精力 -${region.stamina_cost}`
                : `${window.GameCultivation.getRealmName(region.required_realm)}解锁`;
            const detail = scene.add.text(x, y - 44, requirement, {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '14px',
                color: region.unlocked ? '#d8c38c' : '#789087'
            }).setOrigin(0.5);
            const description = scene.add.text(x, y + 6, region.description, {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '15px',
                color: region.unlocked ? '#a9c8bd' : '#64766f',
                align: 'center',
                lineSpacing: 5,
                wordWrap: { width: 226, useAdvancedWrap: true }
            }).setOrigin(0.5);
            view.regionObjects.push(frame, title, detail, description);
            if (region.unlocked) {
                frame.setInteractive({ useHandCursor: true });
                frame.on('pointerdown', () => onSelect(region));
            }
        });
    },
    showDetail(scene, view, region, onBack) {
        this.clear(view.regionObjects);
        this.clear(view.detailObjects);
        view.title.setText(`出山探险 · ${region.name}`);
        const description = scene.add.text(640, 126, region.description, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '19px',
            color: '#f4ead2',
            align: 'center',
            wordWrap: { width: 850, useAdvancedWrap: true }
        }).setOrigin(0.5);
        const detail = scene.add.text(640, 174,
            `险度 ${region.danger}　·　消耗精力 ${region.stamina_cost}　·　可遇见 ${region.npc_ids.length} 位熟人`, {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '16px',
                color: '#d8c38c'
            }).setOrigin(0.5);
        const back = Game.UISkin.makeButton(scene, 1080, 126, '返回区域', onBack, {
            width: 140, height: 44, fontSize: 16, variant: 'secondary'
        });
        view.detailObjects.push(description, detail, back);
    }
};
