var Game = window.Game = window.Game || {};
Game.Data = Game.Data || {};

// 境界配置直接随游戏脚本加载，避免平台静态资源代理偶发阻断小型 JSON 文件。
Game.Data.cultivationLevels = {
    levels: [
        { id: 1, name: '炼气', exp_needed: 100 },
        { id: 2, name: '筑基', exp_needed: 260 },
        { id: 3, name: '金丹', exp_needed: 650 },
        { id: 4, name: '元婴', exp_needed: 1500 },
        { id: 5, name: '化神', exp_needed: 3200 },
        { id: 6, name: '炼虚', exp_needed: 6800 },
        { id: 7, name: '合体', exp_needed: 14000 },
        { id: 8, name: '大乘', exp_needed: 30000 },
        { id: 9, name: '渡劫', exp_needed: 20000000 },
        { id: 10, name: '真仙', exp_needed: 100000000 },
        { id: 11, name: '金仙', exp_needed: 500000000 },
        { id: 12, name: '太乙金仙', exp_needed: 2500000000 },
        { id: 13, name: '大罗金仙', exp_needed: 10000000000 },
        { id: 14, name: '混元金仙', exp_needed: 50000000000 },
        { id: 15, name: '混元无极', exp_needed: -1 }
    ],
    sub_levels: [
        { id: 1, name: '初期' },
        { id: 2, name: '中期' },
        { id: 3, name: '后期' }
    ]
};
