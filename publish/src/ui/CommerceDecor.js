var Game = window.Game || {};

Game.CommerceDecor = {
    rarityColors: Object.freeze({
        普通: 0xaeb8ae,
        精良: 0x79b99d,
        稀有: 0x8db8e8,
        珍品: 0xd989a5,
        传说: 0xe5bd78
    }),

    createShell(scene, title, subtitle) {
        const graphics = scene.add.graphics();
        graphics.fillStyle(0x100c11, 0.91);
        graphics.fillRect(42, 78, 1196, 614);
        graphics.lineStyle(1, 0xe5bd78, 0.42);
        graphics.strokeRect(42, 78, 1196, 614);
        graphics.lineStyle(1, 0xf0a8bb, 0.18);
        graphics.strokeRect(50, 86, 1180, 598);
        graphics.lineStyle(1, 0xe5bd78, 0.34);
        graphics.lineBetween(76, 78, 490, 78);
        graphics.lineBetween(790, 78, 1204, 78);
        this.addCornerMarks(graphics, 42, 78, 1196, 614);
        scene.add.text(640, 46, title, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '36px',
            color: '#fff8fa'
        }).setOrigin(0.5);
        scene.add.text(640, 86, subtitle, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '14px',
            color: '#d8bfc7'
        }).setOrigin(0.5, 0);
        scene.add.text(520, 46, '◇', {
            fontFamily: 'serif', fontSize: '18px', color: '#e5bd78'
        }).setOrigin(0.5);
        scene.add.text(760, 46, '◇', {
            fontFamily: 'serif', fontSize: '18px', color: '#e5bd78'
        }).setOrigin(0.5);
        return graphics;
    },

    addCornerMarks(graphics, x, y, width, height) {
        const size = 24;
        graphics.lineStyle(2, 0xd9577b, 0.62);
        [
            [x, y, 1, 1], [x + width, y, -1, 1],
            [x, y + height, 1, -1], [x + width, y + height, -1, -1]
        ].forEach(([cx, cy, dx, dy]) => {
            graphics.lineBetween(cx, cy, cx + dx * size, cy);
            graphics.lineBetween(cx, cy, cx, cy + dy * size);
        });
    },

    addCurrency(scene, x, y) {
        const frame = scene.add.graphics().setPosition(x, y);
        frame.fillStyle(0x321522, 0.96);
        frame.fillRoundedRect(-118, -25, 236, 50, 6);
        frame.lineStyle(1, 0xe5bd78, 0.52);
        frame.strokeRoundedRect(-118, -25, 236, 50, 6);
        scene.add.text(x - 98, y, '灵石', {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '15px',
            color: '#e5bd78'
        }).setOrigin(0, 0.5);
        return scene.add.text(x + 98, y, '0', {
            fontFamily: 'serif',
            fontSize: '19px',
            color: '#fff8fa',
            fixedWidth: 140,
            align: 'right'
        }).setOrigin(1, 0.5);
    },

    addSlot(scene, x, y, width, height, active) {
        const graphics = scene.add.graphics().setPosition(x, y);
        graphics.fillStyle(active ? 0x321522 : 0x201820, active ? 0.82 : 0.34);
        graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 7);
        graphics.lineStyle(1, active ? 0xf0a8bb : 0x8e7a82, active ? 0.4 : 0.18);
        graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 7);
        graphics.lineStyle(2, active ? 0xd9577b : 0x6d5961, active ? 0.34 : 0.12);
        graphics.lineBetween(-width / 2 + 12, -height / 2 + 7, width / 2 - 12, -height / 2 + 7);
        return graphics;
    },

    addSeal(scene, x, y, label, rarity) {
        const color = this.rarityColors[rarity] || this.rarityColors.普通;
        const graphics = scene.add.graphics();
        graphics.fillStyle(0x17110f, 0.96);
        graphics.fillCircle(x, y, 25);
        graphics.lineStyle(2, color, 0.86);
        graphics.strokeCircle(x, y, 25);
        const text = scene.add.text(x, y, label, {
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '18px',
            color: `#${color.toString(16).padStart(6, '0')}`
        }).setOrigin(0.5);
        return [graphics, text];
    },

    formatNumber(value) {
        return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('zh-CN');
    }
};
