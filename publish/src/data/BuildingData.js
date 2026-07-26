var Game = window.Game || {};
Game.Data = Game.Data || {};

Game.Data.buildings = [
    {
        id: 'welcome-pavilion',
        name: '迎仙阁',
        description: '新弟子登记与来客接引之处，常有温和的师姐在此照应。',
        backgroundKey: 'bg-welcome-pavilion',
        npcIds: ['su_meier'],
        mapX: 220,
        mapY: 220
    },
    {
        id: 'master-palace',
        name: '宗主殿',
        description: '宗门议事中枢，殿内威仪肃然，寻常弟子不敢久留。',
        backgroundKey: 'bg-master-palace',
        npcIds: ['liu_hanyan'],
        mapX: 640,
        mapY: 205
    },
    {
        id: 'discipline-hall',
        name: '戒律堂',
        description: '执掌门规与审问之所，也最适合掩藏不愿示人的身份。',
        backgroundKey: 'bg-discipline-hall',
        npcIds: ['han_yueshuang', 'xiao_qingxuan'],
        mapX: 1060,
        mapY: 220
    },
    {
        id: 'archive-tower',
        name: '藏书阁',
        description: '典籍与秘闻层层封存，阁中总有翻书声在静夜里回响。',
        backgroundKey: 'bg-archive-tower',
        npcIds: ['yun_shuiyao'],
        mapX: 220,
        mapY: 535
    },
    {
        id: 'craft-workshop',
        name: '丹器坊',
        description: '丹炉与锻台昼夜不熄，炼丹师和炼器师在此各占一方。',
        backgroundKey: 'bg-craft-workshop',
        npcIds: ['qin_wanqing', 'mo_qiaoer'],
        mapX: 640,
        mapY: 535
    },
    {
        id: 'rear-sanctuary',
        name: '后山灵境',
        description: '瀑布、洞府与妖气并存，是隐居者和不速之客偏爱的去处。',
        backgroundKey: 'bg-rear-sanctuary',
        npcIds: ['bai_zhi', 'hu_jiuer'],
        mapX: 1060,
        mapY: 535
    }
];
