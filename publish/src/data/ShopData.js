var Game = window.Game || {};
Game.Data = Game.Data || {};

/**
 * 六处建筑各自出售符合场景用途的货品。
 * 商品只保存物品 ID 与价格，名称、效果和说明统一从 items.json 读取。
 */
Game.Data.shops = {
    'welcome-pavilion': {
        name: '迎仙小铺',
        keeper: '接引弟子',
        offers: [
            { itemId: 'welcome_charm', price: 12 },
            { itemId: 'cloud_spirit_tea', price: 22 },
            { itemId: 'silk_fan', price: 35 },
            { itemId: 'junior_insight_note', price: 55 }
        ]
    },
    'master-palace': {
        name: '宗主殿珍藏',
        keeper: '内殿执事',
        offers: [
            { itemId: 'grand_gathering_pill', price: 90 },
            { itemId: 'marrow_jade_pill', price: 130 },
            { itemId: 'phoenix_hairpin', price: 160 },
            { itemId: 'spirit_focus_seal', price: 180 }
        ]
    },
    'discipline-hall': {
        name: '戒律堂供给',
        keeper: '执法弟子',
        offers: [
            { itemId: 'cold_incense', price: 100 },
            { itemId: 'iron_body_talisman', price: 145 },
            { itemId: 'shadow_step_talisman', price: 145 },
            { itemId: 'discipline_elixir', price: 170 }
        ]
    },
    'archive-tower': {
        name: '藏书阁拓印处',
        keeper: '守阁书灵',
        offers: [
            { itemId: 'ancient_inkstone', price: 180 },
            { itemId: 'insight_scroll', price: 220 },
            { itemId: 'soul_lamp_oil', price: 220 },
            { itemId: 'secret_manual_fragment', price: 240 }
        ]
    },
    'craft-workshop': {
        name: '丹器坊柜台',
        keeper: '丹器执事',
        offers: [
            { itemId: 'jade_hair_comb', price: 300 },
            { itemId: 'foundation_pill', price: 320 },
            { itemId: 'body_refining_pill', price: 360 },
            { itemId: 'weapon_essence', price: 360 }
        ]
    },
    'rear-sanctuary': {
        name: '后山灵物摊',
        keeper: '灵境守山人',
        offers: [
            { itemId: 'fox_bell', price: 380 },
            { itemId: 'wind_spirit_dew', price: 420 },
            { itemId: 'fortune_berry', price: 450 },
            { itemId: 'thousand_year_fruit', price: 520 }
        ]
    }
};
