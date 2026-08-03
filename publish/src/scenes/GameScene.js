var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.GameScene = class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.playerData = null;
        this.npcSystem = null;
        this.dialogueSystem = null;
        this.viewObjects = [];
        this.currentBuilding = null;
        this.backdrop = null;
        this.savedSnapshot = null;
        this.newGame = false;
    }

    init(data) {
        this.playerData = data.playerOrigin || null;
        this.savedSnapshot = data.saveSnapshot || null;
        this.newGame = data.newGame === true;
    }

    create() {
        window.GameModelUI.setMode('compact');
        this.npcSystem = new Game.NPCSystem(this);
        this.npcSystem.init();
        Game.systemsReady = window.GamePlayerState.initialize(
            this,
            this.playerData,
            this.npcSystem,
            this.savedSnapshot,
            this.newGame
        );
        this.dialogueSystem = new Game.DialogueSystem(this, this.npcSystem);
        Game.EventBus.on('time-period-changed', this.refreshLighting, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.showSectMap();
        Game.SceneTransition.fadeIn(this);
        this.scene.launch('UIScene');
        if (this.savedSnapshot) {
            Game.systemsReady.then(() => this.showSavedLocation(this.savedSnapshot.location));
        }
    }

    addViewObject(object) {
        this.viewObjects.push(object);
        return object;
    }

    clearView() {
        if (this.dialogueSystem?.isActive()) this.dialogueSystem.endDialogue();
        this.viewObjects.forEach((object) => object.destroy());
        this.viewObjects = [];
    }

    refreshLighting() {
        Game.SceneBackdrop.applyPeriod(this.backdrop);
    }

    cleanup() {
        Game.EventBus.off('time-period-changed', this.refreshLighting, this);
    }

    showSectMap() {
        this.clearView();
        this.currentBuilding = null;
        this.backdrop = Game.SceneBackdrop.create(this, 'bg-sect-map', 0.08);
        this.addViewObject(this.add.text(640, 38, '合欢宗 · 山门总览', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '32px',
            color: '#fff8fa',
            stroke: '#321522',
            strokeThickness: 4
        }).setOrigin(0.5));
        Game.Data.buildings.forEach((building) => this.createBuildingMarker(building));
        this.createPrivateSceneArrow();
    }

    createBuildingMarker(building) {
        const halo = this.addViewObject(
            this.add.ellipse(building.mapX, building.mapY + 30, 252, 184, 0x321522, 0.14)
                .setBlendMode(Phaser.BlendModes.MULTIPLY)
        );
        const marker = this.addViewObject(
            this.add.ellipse(building.mapX, building.mapY + 30, 270, 198, 0x321522, 0)
                .setInteractive({ useHandCursor: true })
        );
        this.addViewObject(this.add.text(building.mapX, building.mapY + 48, building.name, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '22px',
            color: '#fff8fa',
            stroke: '#321522',
            strokeThickness: 3
        }).setOrigin(0.5));
        this.addViewObject(this.add.text(
            building.mapX,
            building.mapY + 85,
            `${building.npcIds.length} 位人物`,
            {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '14px',
                color: '#f0a8bb',
                stroke: '#321522',
                strokeThickness: 2
            }
        ).setOrigin(0.5));
        marker.on('pointerover', () => {
            halo.setAlpha(0.23);
            halo.setScale(1.03);
        });
        marker.on('pointerout', () => {
            halo.setAlpha(0.14);
            halo.setScale(1);
        });
        marker.on('pointerdown', () => {
            window.GameAudio.sfx('click');
            this.showBuilding(building);
        });
    }

    createPrivateSceneArrow() {
        // 箭头放在山门总览右侧中部，避开顶部操作栏和右上角设置按钮。
        const arrowHalo = this.addViewObject(
            this.add.circle(1244, 360, 34, 0x321522, 0.18)
                .setBlendMode(Phaser.BlendModes.MULTIPLY)
        );
        const arrow = this.addViewObject(this.add.text(1244, 360, '▶', {
            fontFamily: 'serif',
            fontSize: '42px',
            color: '#fff8fa',
            stroke: '#321522',
            strokeThickness: 3
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        arrow.on('pointerover', () => {
            arrowHalo.setAlpha(0.28);
            arrowHalo.setScale(1.08);
        });
        arrow.on('pointerout', () => {
            arrowHalo.setAlpha(0.18);
            arrowHalo.setScale(1);
        });
        arrow.on('pointerdown', () => this.openPrivateScene());
    }

    openPrivateScene() {
        if (this.scene.isActive('PrivateScene')) return;
        window.GameAudio.sfx('click');
        Game.SceneTransition.fadeOut(this, () => {
            this.scene.pause('GameScene');
            this.scene.pause('UIScene');
            this.scene.setVisible(false, 'GameScene');
            this.scene.setVisible(false, 'UIScene');
            window.GameModelUI.setMode('hidden');
            this.scene.launch('PrivateScene', { sceneIndex: 0 });
        });
    }

    showBuilding(building) {
        this.clearView();
        this.currentBuilding = building;
        this.backdrop = Game.SceneBackdrop.create(this, 'bg-sect', 0.22);
        Game.BuildingAssets.apply(this, building, this.backdrop);
        const title = this.addViewObject(this.add.text(640, 58, building.name, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '36px',
            color: '#fff8fa',
            stroke: '#321522',
            strokeThickness: 4
        }).setOrigin(0.5));
        const headerOffset = Math.max(160, Math.ceil(title.displayWidth / 2) + 99);
        this.addViewObject(this.add.text(640, 106, building.description, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '17px',
            color: '#f0a8bb',
            wordWrap: { width: 760 },
            align: 'center'
        }).setOrigin(0.5));
        this.createBackButton(640 + headerOffset);
        Game.ShopEntry.create(this, building, 640 - headerOffset);
        const npcs = building.npcIds
            .map((id) => this.npcSystem.getNpcDataById(id))
            .filter(Boolean);
        const gap = 270;
        const startX = 640 - ((npcs.length - 1) * gap) / 2;
        npcs.forEach((npc, index) => {
            Game.NpcCardRenderer.create(this, npc, startX + index * gap);
        });
    }

    showSavedLocation(location) {
        const building = Game.Data.buildings.find((item) => item.id === location?.buildingId);
        if (building) this.showBuilding(building);
        else this.showSectMap();
    }

    createBackButton(x = 800) {
        const isRearSanctuary = this.currentBuilding?.id === 'rear-sanctuary';
        const button = this.addViewObject(Game.UISkin.makeButton(
            this,
            x,
            58,
            '返回地图',
            () => {
            // 对话层打开时禁止处理地图按钮，防止移动端同一触摸事件点穿。
            if (window.GameAI.isDialogueActive()) return;
            window.GameAudio.sfx('click');
            this.showSectMap();
            },
            {
                width: 150,
                height: 46,
                fontSize: 17,
                variant: 'secondary',
                stopPropagation: isRearSanctuary
            }
        ));
        if (isRearSanctuary) button.setDepth(30);
    }

};

/**
 * 玩家私人场景。
 * 六处地点共享同一个场景控制器，只切换背景与地点文案，不复制六套交互逻辑。
 */
Game.Scenes.PrivateScene = class PrivateScene extends Phaser.Scene {
    constructor() {
        super('PrivateScene');
        this.locations = [
            {
                name: '静修洞府',
                description: '属于你的清幽洞府，适合闭关、品茶，也适合与信赖之人安静相处。',
                key: 'bg-private-cave',
                path: './assets/generated/bg-private-cave.07089792.webp'
            },
            {
                name: '听竹林',
                description: '竹影随风，灵气在叶间流转，是适合谈心与调息的清静所在。',
                key: 'bg-private-bamboo',
                path: './assets/generated/bg-private-bamboo.ab733237.webp'
            },
            {
                name: '云雾温泉',
                description: '山泉温润，雾气常年不散，疲惫时可来此洗去尘劳。',
                key: 'bg-private-hot-spring',
                path: './assets/generated/bg-private-hot-spring.adae3403.webp'
            },
            {
                name: '花灵台',
                description: '灵花在云台上四季不谢，花香会随来客的心境改变。',
                key: 'bg-private-flower-terrace',
                path: './assets/generated/bg-private-flower-terrace.8c4921b4.webp'
            },
            {
                name: '月影水榭',
                description: '临水而建的观月小榭，夜深时能听见远山灵泉的回声。',
                key: 'bg-private-moon-pavilion',
                path: './assets/generated/bg-private-moon-pavilion.d9418dfc.webp'
            },
            {
                name: '灵植药圃',
                description: '你亲手打理的灵植园，药香清润，适合整理收获与规划修行。',
                key: 'bg-private-spirit-garden',
                path: './assets/generated/bg-private-spirit-garden.6a80bf37.webp'
            }
        ];
        this.sceneIndex = 0;
        this.background = null;
        this.titleText = null;
        this.descriptionText = null;
        this.statusText = null;
        this.storyText = null;
        this.inviteButton = null;
        this.inviteMenuPanel = null;
        this.inviteMenuObjects = [];
        this.inviteMenuVisible = false;
        this.selectedInviteIds = new Set();
        this.invitedNpcs = [];
        this.talkButton = null;
        this.talkMenuPanel = null;
        this.talkMenuObjects = [];
        this.talkMenuVisible = false;
        this.locationObjects = [];
        this.busy = false;
        this.npcSystem = null;
    }

    init(data) {
        const index = Math.floor(Number(data?.sceneIndex) || 0);
        this.sceneIndex = (index + this.locations.length) % this.locations.length;
    }

    create() {
        const base = this.scene.get('GameScene');
        this.npcSystem = base.npcSystem;
        this.background = this.add.image(640, 360, 'bg-sect-map')
            .setDisplaySize(1280, 720);
        this.add.rectangle(640, 360, 1280, 720, 0x06100d, 0.4);
        this.titleText = this.add.text(640, 54, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '34px',
            color: '#fff8fa',
            stroke: '#321522',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.descriptionText = this.add.text(640, 102, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '16px',
            color: '#f0a8bb',
            wordWrap: { width: 760 },
            align: 'center'
        }).setOrigin(0.5);
        this.createLocationArrow(58, 96, '◀', -1);
        this.createLocationArrow(1222, 96, '▶', 1);
        this.statusText = this.add.text(640, 535, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '17px',
            color: '#fff8fa',
            wordWrap: { width: 900 },
            align: 'center'
        }).setOrigin(0.5).setVisible(false);
        this.storyText = this.add.text(640, 385, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '18px',
            color: '#fff8fa',
            lineSpacing: 6,
            wordWrap: { width: 860, useAdvancedWrap: true },
            fixedWidth: 920,
            fixedHeight: 250,
            align: 'center'
        }).setOrigin(0.5).setVisible(false).setDepth(4);
        this.createLocationButtons();
        this.createInviteControl();
        this.createCloseButton();
        Game.EventBus.on('affinity-changed', this.renderInvites, this);
        Game.EventBus.on('cultivation-changed', this.renderInvites, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.renderLocation();
        this.renderInvites();
        this.renderTalkMenu();
        this.loadLocationBackgrounds();
        Game.SceneTransition.fadeIn(this);
    }

    createLocationArrow(x, y, label, offset) {
        const arrow = this.add.text(x, y, label, {
            fontFamily: 'serif',
            fontSize: '30px',
            color: '#fff8fa',
            backgroundColor: 'rgba(50,21,34,0.7)',
            padding: { x: 10, y: 6 },
            stroke: '#321522',
            strokeThickness: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        arrow.on('pointerdown', () => {
            if (this.busy) return;
            this.sceneIndex = (this.sceneIndex + offset + this.locations.length)
                % this.locations.length;
            window.GameAudio.sfx('click');
            this.renderLocation();
        });
    }

    createLocationButtons() {
        this.locations.forEach((location, index) => {
            const button = this.add.text(100 + index * 205, 650, location.name, {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '16px',
                color: '#fff8fa',
                backgroundColor: 'rgba(50,21,34,0.78)',
                padding: { x: 12, y: 8 },
                stroke: '#321522',
                strokeThickness: 2
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            button.on('pointerdown', () => {
                if (this.busy) return;
                this.sceneIndex = index;
                window.GameAudio.sfx('click');
                this.renderLocation();
            });
            this.locationObjects.push(button);
        });
    }

    createCloseButton() {
        const close = this.add.text(1138, 54, '返回山门', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '17px',
            color: '#fff8fa',
            backgroundColor: 'rgba(50,21,34,0.78)',
            padding: { x: 13, y: 8 },
            stroke: '#321522',
            strokeThickness: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on('pointerdown', () => this.close());
    }

    createInviteControl() {
        this.inviteButton = Game.UISkin.makeButton(this, 1080, 575, '邀请伴侣', () => {
            if (this.busy) return;
            this.inviteMenuVisible = !this.inviteMenuVisible;
            this.talkMenuVisible = false;
            this.inviteButton.setText(this.inviteMenuVisible ? '收起伴侣' : '邀请伴侣');
            this.renderInvites();
            this.renderTalkMenu();
            window.GameAudio.sfx('click');
        }, { width: 150, height: 46, fontSize: 17, variant: 'secondary' });
        this.inviteMenuPanel = Game.UISkin.addPanel(
            this, 1036, 420, 424, 290, 'card', { depth: 8, alpha: 0.96 }
        )
            .setVisible(false);
        this.talkButton = Game.UISkin.makeButton(this, 930, 575, '伴侣交谈', () => {
            if (this.busy || !this.invitedNpcs.length) return;
            this.talkMenuVisible = !this.talkMenuVisible;
            this.inviteMenuVisible = false;
            this.inviteButton.setText('邀请伴侣');
            this.renderTalkMenu();
            this.renderInvites();
            window.GameAudio.sfx('click');
        }, { width: 150, height: 46, fontSize: 17, variant: 'secondary' })
            .setVisible(false);
        this.talkMenuPanel = Game.UISkin.addPanel(
            this, 1036, 420, 424, 290, 'card', { depth: 8, alpha: 0.96 }
        )
            .setVisible(false);
    }

    renderLocation() {
        const location = this.locations[this.sceneIndex];
        this.titleText.setText(`私人场景 · ${location.name}`);
        this.descriptionText.setText(location.description);
        this.storyText?.setVisible(false);
        this.statusText?.setVisible(false);
        this.locationObjects.forEach((button, index) => {
            button.setAlpha(index === this.sceneIndex ? 1 : 0.62);
        });
        if (this.textures.exists(location.key)) {
            this.background.setTexture(location.key).setDisplaySize(1280, 720);
        }
    }

    loadLocationBackgrounds() {
        const missing = this.locations.filter((location) => !this.textures.exists(location.key));
        if (!missing.length) return;
        this.statusText.setText('正在布置私人场景…').setVisible(true);
        missing.forEach((location) => this.load.image(location.key, location.path));
        this.load.once('complete', () => {
            if (!this.statusText?.active) return;
            this.statusText.setVisible(false);
            this.renderLocation();
        });
        this.load.on('loaderror', (file) => {
            console.error('私人场景背景加载失败:', file.key, file.src);
        });
        this.load.start();
    }

    renderInvites() {
        if (!this.npcSystem?.getAllNpcs) return;
        this.inviteMenuObjects.forEach((object) => object.destroy());
        this.inviteMenuObjects = [];
        this.inviteMenuPanel?.setVisible(this.inviteMenuVisible);
        if (!this.inviteMenuVisible) return;
        this.inviteMenuObjects.push(this.add.text(1036, 296, '选择一位伴侣', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '19px',
            color: '#fff8fa'
        }).setOrigin(0.5).setDepth(9));
        [...this.npcSystem.getAllNpcs().values()].forEach((npc, index) => {
            const affinity = window.GameAffinity.getSnapshot(npc.id);
            const available = affinity.affinity >= 80;
            const selected = this.selectedInviteIds.has(npc.id);
            const column = index % 3;
            const row = Math.floor(index / 3);
            const button = this.add.text(900 + column * 142, 340 + row * 68,
                `${npc.name}\n${available
                    ? (selected ? '已选择' : '可选择')
                    : `好感 ${affinity.affinity}/80`}`, {
                    fontFamily: '"Noto Serif SC", serif',
                    fontSize: '15px',
                    color: selected ? '#321522' : (available ? '#fff8fa' : '#9c7a87'),
                    backgroundColor: selected ? 'rgba(240,168,187,0.9)'
                        : (available ? 'rgba(109,40,66,0.82)' : 'rgba(50,21,34,0.5)'),
                    padding: { x: 12, y: 7 },
                    align: 'center',
                    stroke: '#321522',
                    strokeThickness: 2
                }).setOrigin(0.5).setDepth(9);
            if (available) {
                button.setInteractive({ useHandCursor: true });
                button.on('pointerdown', () => {
                    if (this.selectedInviteIds.has(npc.id)) {
                        this.selectedInviteIds.delete(npc.id);
                    } else {
                        this.selectedInviteIds.add(npc.id);
                    }
                    this.renderInvites();
                    window.GameAudio.sfx('click');
                });
            }
            this.inviteMenuObjects.push(button);
        });
        const selectedCount = this.selectedInviteIds.size;
        const confirm = this.add.text(
            1036,
            535,
            selectedCount ? `邀请 ${selectedCount} 位伴侣双修` : '请选择伴侣',
            {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '16px',
                color: selectedCount ? '#321522' : '#9c7a87',
                backgroundColor: selectedCount
                    ? 'rgba(240,168,187,0.9)'
                    : 'rgba(50,21,34,0.54)',
                padding: { x: 14, y: 7 },
                align: 'center',
                stroke: '#321522',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(9);
        if (selectedCount) {
            confirm.setInteractive({ useHandCursor: true });
            confirm.on('pointerdown', () => {
                const selectedNpcs = [...this.npcSystem.getAllNpcs().values()]
                    .filter((npc) => this.selectedInviteIds.has(npc.id));
                this.inviteNpcs(selectedNpcs);
            });
        }
        this.inviteMenuObjects.push(confirm);
    }

    buildDualCultivationFallback(companions, result, cultivationBefore) {
        const names = companions.map((npc) => npc.name).join('、');
        if (!result.changed) {
            const reason = result.reason === 'stamina'
                ? '精力不足，灵台难以维持稳定'
                : '修为已经接近瓶颈，灵气无法继续沉淀';
            return [
                `你与${names}在私人场景中盘膝相对，尝试引导灵息汇入经脉。`,
                `可惜当前${reason}，几人的气息只在周身缓缓回旋，最终化作一阵清风散去。`,
                `虽然这次未能取得修为进展，但彼此之间的默契并未消退，`,
                `${names}也约定待你准备妥当后再继续这场修行。`
            ].join('');
        }
        const resultText = cultivationBefore.canBreakthrough
            ? `在灵息交汇到最深处时，你的境界壁垒应声而裂，终于踏入${result.snapshot.realmName}。`
            : `一轮周天运行结束，你的经脉被温和的灵力洗涤，当前境界修为增加了${result.gain}点。`;
        return [
            `你带着${names}来到${this.locations[this.sceneIndex].name}，`,
            '四周的灵花、竹影与水雾都在合修气机的牵引下缓慢改变。',
            '众人没有急于催动灵力，而是先以神识确认彼此的节奏，',
            '再让各自的真元沿着既定的周天交替流转。',
            `${names}的气息一一融入阵势，时而如春水相逢，时而如月光映雪，`,
            '原本散乱的灵息逐渐被整理成稳定而清澈的回路。',
            '你在其中感受到同伴的信任，也察觉到自己的心境比独自修炼时更加澄明。',
            resultText,
            '余韵散去后，场景重新归于安静，几位伴侣仍在身旁调息，',
            '彼此之间多了一份只有共同经历过这场修行才懂的默契。'
        ].join('');
    }

    async inviteNpcs(npcs) {
        if (this.busy) return;
        const companions = (npcs || []).filter(Boolean);
        if (!companions.length) return;
        const affinities = companions.map((npc) => window.GameAffinity.getSnapshot(npc.id));
        const unavailable = affinities.find((affinity) => affinity.affinity < 80);
        if (unavailable) {
            this.statusText.setText('所选伴侣的好感度都需要达到 80 才能一同双修。')
                .setVisible(true);
            return;
        }
        this.selectedInviteIds.clear();
        this.inviteMenuVisible = false;
        this.inviteButton.setText('邀请伴侣');
        this.renderInvites();
        this.busy = true;
        const companionNames = companions.map((npc) => npc.name).join('、');
        this.statusText.setText(
            `正在邀请${companionNames}，AI 正在生成长篇双修剧情…`
        ).setVisible(true);
        try {
            const cultivation = window.GameCultivation.getSnapshot();
            let result;
            if (cultivation.canBreakthrough) {
                const lowestAffinity = Math.min(...affinities.map((item) => item.affinity));
                result = await window.GameCultivation.breakthrough(
                    companions[0].id,
                    lowestAffinity
                );
            } else if (Game.player.stamina > 0) {
                Game.player.stamina -= 1;
                result = await window.GameCultivation.addCultivationPercent(
                    3 + Math.max(0, companions.length - 1),
                    'dual_cultivation'
                );
                Game.EventBus.emit('player-state-changed', { player: { ...Game.player } });
            } else {
                result = { changed: false, reason: 'stamina' };
            }
            if (result.changed) {
                this.invitedNpcs = companions.slice();
                this.talkButton.setVisible(true);
                this.talkMenuVisible = false;
                this.renderTalkMenu();
            }
            const fallback = this.buildDualCultivationFallback(
                companions,
                result,
                cultivation
            );
            this.storyText.setText('灵息正在交汇，AI 正在续写这场合修…').setVisible(true);
            const story = await window.GameNarrative.generateDetailed('dual_cultivation', {
                companions: companions.map((npc, index) => ({
                    name: npc.name,
                    title: npc.title,
                    realm: npc.realm_label,
                    affinity: affinities[index].affinity,
                    personality: npc.personality
                })),
                playerRealm: window.GameCultivation.getSnapshot().label,
                playerStamina: `${Game.player.stamina}/${Game.player.maxStamina}`,
                companionCount: companions.length,
                result: fallback
            }, fallback, (text) => {
                if (this.storyText?.active) {
                    this.storyText.setText(Game.TextBoxUtils.fit(text, 46, 9));
                }
            });
            window.GameAudio.sfx(result.changed ? 'success' : 'deny');
            this.statusText.setVisible(false);
            this.storyText.setText(Game.TextBoxUtils.fit(story, 46, 9)).setVisible(true);
        } catch (error) {
            console.error('私人场景合修失败:', error.code || '', error.message, error.stack);
            this.statusText.setText('双修暂时无法完成，请稍后再试。').setVisible(true);
        } finally {
            this.busy = false;
            this.renderInvites();
        }
    }

    renderTalkMenu() {
        this.talkMenuObjects.forEach((object) => object.destroy());
        this.talkMenuObjects = [];
        this.talkMenuPanel?.setVisible(this.talkMenuVisible && this.invitedNpcs.length > 0);
        if (!this.talkMenuVisible || !this.invitedNpcs.length) return;
        this.talkMenuObjects.push(this.add.text(1036, 300, '选择交谈对象', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '19px',
            color: '#fff8fa'
        }).setOrigin(0.5).setDepth(9));
        this.invitedNpcs.forEach((npc, index) => {
            const affinity = window.GameAffinity.getSnapshot(npc.id);
            const button = this.add.text(900 + (index % 3) * 142, 355 + Math.floor(index / 3) * 58,
                `${npc.name}\n好感 ${affinity.affinity}`, {
                    fontFamily: '"Noto Serif SC", serif',
                    fontSize: '16px',
                    color: '#fff8fa',
                    backgroundColor: 'rgba(109,40,66,0.82)',
                    padding: { x: 12, y: 7 },
                    align: 'center',
                    stroke: '#321522',
                    strokeThickness: 2
                }).setOrigin(0.5).setDepth(9).setInteractive({ useHandCursor: true });
            button.on('pointerdown', () => this.talkToCompanion(npc));
            this.talkMenuObjects.push(button);
        });
    }

    talkToCompanion(npc) {
        if (!npc || this.busy) return;
        this.talkMenuVisible = false;
        this.renderTalkMenu();
        window.GameAudio.sfx('click');
        window.GameModelUI.setMode('compact');
        const gameScene = this.scene.get('GameScene');
        gameScene.dialogueSystem?.startDialogue(npc.id, {
            building: { name: this.locations[this.sceneIndex].name }
        });
    }

    close() {
        if (this.busy) return;
        window.GameAudio.sfx('click');
        Game.SceneTransition.fadeOut(this, () => {
            const gameScene = this.scene.get('GameScene');
            const uiScene = this.scene.get('UIScene');
            this.scene.setVisible(true, 'GameScene');
            this.scene.setVisible(true, 'UIScene');
            this.scene.resume('GameScene');
            this.scene.resume('UIScene');
            this.scene.stop();
            window.GameModelUI.setMode('compact');
            Game.SceneTransition.fadeIn(gameScene);
            Game.SceneTransition.fadeIn(uiScene);
        });
    }

    cleanup() {
        window.GameNarrative.cancel();
        Game.EventBus.off('affinity-changed', this.renderInvites, this);
        Game.EventBus.off('cultivation-changed', this.renderInvites, this);
    }
};
