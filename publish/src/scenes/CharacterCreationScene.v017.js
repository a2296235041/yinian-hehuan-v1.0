/* release 0.1.7 */ var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.CharacterCreationScene = class CharacterCreationScene extends Phaser.Scene {
    constructor() {
        super('CharacterCreationScene');
        this.originsData = [];
        this.selectedOriginIndex = 0;
        this.originNameText = null;
        this.originInfoText = null;
        this.originPortrait = null;
        this.attributeTexts = [];
        this.pageText = null;
    }

    init() {
        this.originsData = this.cache.json.get('character_origins') || [];
    }

    preload() {
        const added = Game.PlayerPortraitAssets.preloadFirst(this);
        if (!added) return;
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.cameras.main.setBackgroundColor('#09100e');
        const label = this.add.text(width / 2, height / 2 - 18, '正在展开命格画卷', {
            fontFamily: '"STKaiti", "KaiTi", "Noto Serif SC", serif',
            fontSize: '28px',
            color: '#fff4f7'
        }).setOrigin(0.5);
        const progress = this.add.text(width / 2, height / 2 + 28, '0%', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '15px',
            color: '#e8b7c7'
        }).setOrigin(0.5);
        const onProgress = (value) => {
            if (progress.active) progress.setText(`${Math.round(value * 100)}%`);
        };
        this.load.on('progress', onProgress);
        this.load.once('complete', () => {
            this.load.off('progress', onProgress);
            if (label.active) label.destroy();
            if (progress.active) progress.destroy();
        });
    }

    create() {
        window.GameModelUI.setMode('compact');
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const background = this.add.image(width / 2, height / 2, 'bg-sect');
        background.setScale(Math.max(width / background.width, height / background.height));
        this.add.rectangle(width / 2, height / 2, width, height, 0x07100d, 0.58);
        const finishDecor = Game.CharacterCreationDecor?.create?.(this, width, height) || (() => {});
        Game.UISkin.addPanel(this, width / 2, height / 2 + 12, 980, 540, 'card', {
            alpha: 0.96
        });
        finishDecor();
        this.add.text(width / 2, 74, '选择你的来路', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '38px',
            color: '#fff8fa'
        }).setOrigin(0.5);

        this.originNameText = this.add.text(width / 2, 154, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#f0a8bb',
            stroke: '#321522',
            strokeThickness: 2
        }).setOrigin(0.5);
        this.originInfoText = this.add.text(width / 2, 202, '', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '17px',
            color: '#fff8fa',
            lineSpacing: 8,
            wordWrap: { width: 780, useAdvancedWrap: true },
            fixedWidth: 800,
            align: 'center'
        }).setOrigin(0.5, 0);
        this.add.text(width / 2, height / 2 + 76, '初始属性', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '17px',
            color: '#f0a8bb'
        }).setOrigin(0.5);
        this.attributeTexts = Array.from({ length: 7 }, (_, index) => {
            const row = Math.floor(index / 3);
            const column = index % 3;
            const x = index === 6 ? width / 2 : width / 2 + (column - 1) * 150;
            return this.add.text(x, height / 2 + 112 + row * 30, '', {
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '18px',
                color: '#fff8fa',
                fixedWidth: 140,
                align: 'center'
            }).setOrigin(0.5);
        });

        this.makeArrow(170, height / 2, '<', () => this.selectOrigin(-1));
        this.makeArrow(width - 170, height / 2, '>', () => this.selectOrigin(1));

        this.pageText = this.add.text(width / 2, height - 116, '', {
            fontFamily: 'serif',
            fontSize: '16px',
            color: '#f0a8bb'
        }).setOrigin(0.5);
        this.originPortrait = this.add.image(
            width - 320,
            height - 92,
            Game.PlayerPortraitAssets.textureKey(this.originsData[0])
        ).setOrigin(0.5, 1);
        Game.PlayerPortraitAssets.fit(this.originPortrait, 190, 300);

        Game.UISkin.makeButton(
            this, width / 2, height - 64, '以此身份入宗',
            (button) => this.confirmSelection(button),
            { width: 260, height: 58, fontSize: 25 }
        );

        if (!this.originsData.length) {
            window.PlatformBridge.fail('DATA_INVALID', '身份数据为空');
            return;
        }
        this.displayOriginInfo();
        Game.SceneTransition.fadeIn(this);
    }

    makeArrow(x, y, label, action) {
        return Game.UISkin.makeButton(this, x, y, label, action, {
            width: 72, height: 58, fontSize: 34, variant: 'secondary'
        });
    }

    displayOriginInfo() {
        const origin = this.originsData[this.selectedOriginIndex];
        const attributes = ['strength', 'constitution', 'agility', 'intelligence', 'charisma', 'wisdom', 'luck']
            .map((key) => `${this.getAttrName(key)}  ${this.formatAttribute(origin.attributes[key])}`);
        this.originNameText.setText(`【${origin.name}】`);
        this.originInfoText.setText(
            `${origin.description}\n\n天赋 · ${origin.talent.name}\n${origin.talent.description}`
        );
        this.showPortrait(origin);
        this.attributeTexts.forEach((text, index) => text.setText(attributes[index] || ''));
        this.pageText.setText(`${this.selectedOriginIndex + 1} / ${this.originsData.length}`);
    }

    selectOrigin(offset) {
        const length = this.originsData.length;
        this.selectedOriginIndex = (this.selectedOriginIndex + offset + length) % length;
        window.GameAudio.sfx('click');
        this.displayOriginInfo();
    }

    showPortrait(origin) {
        const textureKey = Game.PlayerPortraitAssets.textureKey(origin);
        if (this.textures.exists(textureKey)) {
            this.originPortrait.setTexture(textureKey).setVisible(true);
            Game.PlayerPortraitAssets.fit(this.originPortrait, 190, 300);
            return;
        }
        this.originPortrait.setVisible(false);
        const selectedId = origin.id;
        Game.PlayerPortraitAssets.ensureLoaded(this, origin).then((loadedKey) => {
            if (!this.scene.isActive() || this.originsData[this.selectedOriginIndex]?.id !== selectedId) {
                return;
            }
            this.originPortrait.setTexture(loadedKey).setVisible(true);
            Game.PlayerPortraitAssets.fit(this.originPortrait, 190, 300);
        }).catch((error) => {
            console.error('身份立绘加载失败:', error.message, error.stack);
        });
    }

    confirmSelection(button) {
        button.disableInteractive();
        window.GameAudio.sfx('success');
        Game.SceneTransition.start(this, 'GameScene', {
            playerOrigin: this.originsData[this.selectedOriginIndex],
            newGame: true
        });
    }

    getAttrName(id) {
        const names = {
            strength: '力量', constitution: '根骨', agility: '身法',
            intelligence: '神识', charisma: '魅力', wisdom: '悟性', luck: '气运'
        };
        return names[id] || id;
    }

    formatAttribute(value) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? String(Math.round(numeric)).padStart(2, '0') : String(value);
    }
};
