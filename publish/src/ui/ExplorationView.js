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
        scene.add.rectangle(18, 18, 320, 120, 0x0d1b17, 0.82)
            .setOrigin(0, 0)
            .setStrokeStyle(1, 0xd8c38c, 0.55);
        const playerInfo = scene.add.text(32, 29, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '14px',
            color: '#f4ead2',
            lineSpacing: 5
        });
        const close = scene.add.text(1200, 42, '返回宗门', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '18px',
            color: '#f4ead2',
            backgroundColor: 'rgba(13,27,23,0.58)',
            padding: { x: 14, y: 8 },
            stroke: '#14231f',
            strokeThickness: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on('pointerdown', onClose);
        const status = scene.add.text(640, 520, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '18px',
            color: '#f4ead2',
            backgroundColor: 'rgba(13,27,23,0.86)',
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
        regions.forEach((region, index) => {
            const x = 175 + (index % 4) * 310;
            const y = 260 + Math.floor(index / 4) * 255;
            const color = region.unlocked ? 0x14231f : 0x101714;
            const frame = scene.add.rectangle(x, y, 270, 230, color, 0.82)
                .setStrokeStyle(2, region.unlocked ? 0xd8c38c : 0x42685c, 0.72);
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
        const back = scene.add.text(1080, 126, '返回区域', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '17px',
            color: '#f4ead2',
            backgroundColor: 'rgba(13,27,23,0.56)',
            padding: { x: 13, y: 8 },
            stroke: '#14231f',
            strokeThickness: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        back.on('pointerdown', onBack);
        view.detailObjects.push(description, detail, back);
    }
};
