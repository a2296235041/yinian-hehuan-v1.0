var Game = window.Game || {};
Game.Scenes = Game.Scenes || {};

Game.Scenes.CharacterCreationScene = class CharacterCreationScene extends Phaser.Scene {
    constructor() {
        super('CharacterCreationScene');
        this.originsData = [];
        this.selectedOriginIndex = 0;
        this.originNameText = null;
        this.originInfoText = null;
        this.attributeText = null;
        this.pageText = null;
    }

    init() {
        this.originsData = this.cache.json.get('character_origins') || [];
    }

    create() {
        window.GameModelUI.setMode('compact');
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const background = this.add.image(width / 2, height / 2, 'bg-sect');
        background.setScale(Math.max(width / background.width, height / background.height));
        this.add.rectangle(width / 2, height / 2, width, height, 0x07100d, 0.58);
        Game.UISkin.addPanel(this, width / 2, height / 2 + 12, 980, 540, 'card', {
            alpha: 0.96
        });

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
        this.add.text(width / 2, height / 2 + 98, '初始属性', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '17px',
            color: '#f0a8bb'
        }).setOrigin(0.5);
        this.attributeText = this.add.text(width / 2, height / 2 + 143, '', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#fff8fa',
            lineSpacing: 9,
            align: 'center'
        }).setOrigin(0.5);

        this.makeArrow(170, height / 2, '<', () => this.selectOrigin(-1));
        this.makeArrow(width - 170, height / 2, '>', () => this.selectOrigin(1));

        this.pageText = this.add.text(width / 2, height - 116, '', {
            fontFamily: 'serif',
            fontSize: '16px',
            color: '#f0a8bb'
        }).setOrigin(0.5);

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
            .map((key) => `${this.getAttrName(key)} ${this.formatAttribute(origin.attributes[key])}`)
            .reduce((rows, value, index) => {
                const rowIndex = Math.floor(index / 3);
                rows[rowIndex] = rows[rowIndex] || [];
                rows[rowIndex].push(value.padEnd(10, ' '));
                return rows;
            }, [])
            .map((row) => row.join('  '))
            .join('\n');
        this.originNameText.setText(`【${origin.name}】`);
        this.originInfoText.setText(
            `${origin.description}\n\n天赋 · ${origin.talent.name}\n${origin.talent.description}`
        );
        this.attributeText.setText(attributes);
        this.pageText.setText(`${this.selectedOriginIndex + 1} / ${this.originsData.length}`);
    }

    selectOrigin(offset) {
        const length = this.originsData.length;
        this.selectedOriginIndex = (this.selectedOriginIndex + offset + length) % length;
        window.GameAudio.sfx('click');
        this.displayOriginInfo();
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
