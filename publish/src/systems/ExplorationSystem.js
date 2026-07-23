(function installExplorationSystem(root) {
  'use strict';

  const regions = new Map();
  const enemies = new Map();
  let npcSystem = null;
  let busy = false;

  function randomInt(min, max) {
    return Math.floor(Number(min) + Math.random() * (Number(max) - Number(min) + 1));
  }

  function pick(values) {
    return values?.length ? values[Math.floor(Math.random() * values.length)] : null;
  }

  function initialize(regionData, enemyData, npcs) {
    (regionData || []).forEach((region) => regions.set(region.id, { ...region }));
    (enemyData || []).forEach((enemy) => enemies.set(enemy.id, { ...enemy }));
    npcSystem = npcs;
  }

  function getRegions() {
    const realmIndex = root.GameCultivation.getSnapshot().realmIndex;
    return [...regions.values()].map((region) => ({
      ...region,
      unlocked: realmIndex >= Number(region.required_realm)
    }));
  }

  function consumeStamina(region) {
    const cost = Math.max(1, Math.floor(Number(region.stamina_cost) || 1));
    if (!root.Game.player || root.Game.player.stamina < cost) return false;
    root.Game.player.stamina -= cost;
    root.Game.EventBus.emit('player-state-changed', { ...root.Game.player });
    return true;
  }

  async function npcEncounter(region) {
    const npcId = pick(region.npc_ids);
    const npc = npcSystem?.getNpcDataById(npcId);
    if (!npc) return { type: 'nothing', text: '山路寂静，你只听见风穿过林梢。' };
    const gain = randomInt(2, 4);
    const result = await root.GameAffinity.addBonus(npc.id, gain, 'exploration');
    return {
      type: 'npc',
      npc,
      gain,
      text: `你在${region.name}偶遇${npc.name}，结伴同行片刻，好感 +${gain}。`,
      durable: result.durable
    };
  }

  async function curioEncounter(region) {
    const itemId = pick(region.loot_ids);
    const quantity = Math.random() < 0.22 ? 2 : 1;
    const cultivation = randomInt(region.cultivation_min, region.cultivation_max);
    const stones = randomInt(region.stone_min, region.stone_max);
    const itemResult = await root.GameInventory.add(itemId, quantity, 'exploration');
    await root.GameInventory.addSpiritStones(stones, 'exploration');
    const cultivationResult = await root.GameCultivation.addCultivation(cultivation, 'exploration');
    const itemName = itemResult.item?.name || '未知物品';
    const gainText = cultivationResult.changed ? `，修为 +${cultivationResult.gain}` : '，修为已达瓶颈';
    return {
      type: 'curio',
      item: itemResult.item,
      quantity,
      spiritStones: stones,
      cultivation: cultivationResult.gain || 0,
      text: `你发现一处隐秘机缘，获得${itemName} ×${quantity}、灵石 ${stones}${gainText}。`
    };
  }

  function battleEncounter(region) {
    const enemy = enemies.get(pick(region.enemy_ids));
    if (!enemy) return { type: 'nothing', text: '附近似有异动，但最终什么也没有出现。' };
    return {
      type: 'battle',
      region,
      enemy: { ...enemy },
      text: `你在${region.name}遭遇了${enemy.name}！`
    };
  }

  // 每次点击只结算一次探索，不设置自动重试或定时循环，避免重复扣除精力。
  async function explore(regionId) {
    if (busy) return { type: 'error', text: '上一次探索仍在结算。' };
    busy = true;
    try {
      await Promise.all([root.GameInventory.ready(), root.GameCultivation.ready(), root.GameAffinity.ready()]);
      const region = regions.get(regionId);
      if (!region) return { type: 'error', text: '未找到该探索区域。' };
      if (root.GameCultivation.getSnapshot().realmIndex < Number(region.required_realm)) {
        return { type: 'locked', text: '当前境界尚不足以进入此地。' };
      }
      if (!consumeStamina(region)) return { type: 'stamina', text: '精力不足，无法继续出山。' };
      const roll = Math.random();
      if (roll < 0.24) return await npcEncounter(region);
      if (roll < 0.58) return battleEncounter(region);
      if (roll < 0.98) return await curioEncounter(region);
      return { type: 'nothing', text: '一路风平浪静，无事发生。' };
    } finally {
      busy = false;
    }
  }

  async function completeBattle(encounter) {
    const enemy = encounter?.enemy;
    if (!enemy) return { text: '战斗奖励结算失败。' };
    const cultivation = await root.GameCultivation.addCultivation(
      enemy.cultivation_reward,
      'battle'
    );
    const loot = await root.GameInventory.add(enemy.loot_id, 1, 'battle');
    const stones = Math.max(0, Math.floor(Number(enemy.stone_reward) || 0));
    if (stones > 0) await root.GameInventory.addSpiritStones(stones, 'battle');
    const itemName = loot.item?.name || '战利品';
    const gainText = cultivation.changed ? `修为 +${cultivation.gain}` : '修为已达瓶颈';
    return {
      text: `战斗胜利！${gainText}，获得${itemName} ×1、灵石 ${stones}。`,
      cultivation,
      loot,
      spiritStones: stones
    };
  }

  root.GameExploration = {
    initialize,
    getRegions,
    explore,
    completeBattle,
    isBusy: () => busy
  };
}(window));
