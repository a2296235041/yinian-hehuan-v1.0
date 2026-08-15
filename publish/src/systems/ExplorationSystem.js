(function installExplorationSystem(root) {
  'use strict';
  const regions = new Map(), enemies = new Map();
  let npcSystem = null;
  let busy = false;
  const persistence = root.GamePersistenceStatus;

  function randomInt(min, max) {
    return Math.floor(Number(min) + Math.random() * (Number(max) - Number(min) + 1));
  }

  function pick(values) {
    return values?.length ? values[Math.floor(Math.random() * values.length)] : null;
  }

  function hasTalent(id) {
    return root.Game.player?.origin?.talent?.id === id;
  }

  function initialize(regionData, enemyData, npcs) {
    (regionData || []).forEach((region) => regions.set(region.id, { ...region }));
    (enemyData || []).forEach((enemy) => enemies.set(enemy.id, { ...enemy }));
    npcSystem = npcs;
  }

  function getRegions() {
    const realmIndex = root.GameCultivation.getSnapshot().realmIndex;
    const stats = root.GamePlayerStats.getSnapshot();
    return [...regions.values()].map((region) => {
      const requirements = [
        ['攻击', stats.attack, region.recommended_attack],
        ['气血', stats.maxHp, region.recommended_hp],
        ['防御', stats.defense, region.recommended_defense],
        ['速度', stats.speed, region.recommended_speed]
      ];
      const missingStats = requirements
        .filter(([, current, target]) => Number(current) < Number(target || 0))
        .map(([label]) => label);
      return {
        ...region,
        unlocked: realmIndex >= Number(region.required_realm),
        prepared: missingStats.length === 0,
        missingStats
      };
    });
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
    return persistence.result('探索遭遇', result.changed, result.durable, {
      type: 'npc', npc, gain, affinity: result,
      text: `你在${region.name}偶遇${npc.name}，结伴同行片刻，好感 +${gain}。`
    });
  }

  async function curioEncounter(region) {
    const itemId = pick(region.loot_ids);
    const extraLootChance = hasTalent('battle_hunter') ? 0.42 : 0.22;
    const quantity = Math.random() < extraLootChance ? 2 : 1;
    const cultivation = randomInt(region.cultivation_min, region.cultivation_max);
    const stones = randomInt(region.stone_min, region.stone_max);
    const itemResult = await root.GameInventory.add(itemId, quantity, 'exploration');
    const stoneResult = await root.GameInventory.addSpiritStones(stones, 'exploration');
    const cultivationResult = await root.GameCultivation.addCultivation(cultivation, 'exploration');
    const itemName = itemResult.item?.name || '未知物品';
    const gainText = cultivationResult.changed ? `，修为 +${cultivationResult.gain}` : '，修为已达瓶颈';
    return persistence.combine('探索奖励', [itemResult, stoneResult, cultivationResult], {
      type: 'curio',
      item: itemResult.item,
      quantity,
      spiritStones: stones,
      cultivation: cultivationResult.gain || 0,
      itemResult,
      stoneResult,
      cultivationResult,
      text: `你发现一处隐秘机缘，获得${itemName} ×${quantity}、灵石 ${stones}${gainText}。`
    });
  }

  // 神级丹 5%，圣品丹 15%，二者互斥，剩余概率继续走普通遭遇。
  async function rarePillEncounter(itemId) {
    const added = await root.GameInventory.add(itemId, 1, 'exploration');
    const itemName = added.item?.name || '稀有修为丹';
    const percent = added.item?.cultivation_percent || 0;
    return persistence.result('探索奖励', added.changed, added.durable, {
      type: 'pill', item: added.item, quantity: 1, itemResult: added,
      text: `探险途中发现${itemName} ×1，使用后可直接增加当前境界 ${percent}% 修为。`
    });
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

  function withIntent(result, intent) {
    return {
      ...result,
      intent: String(intent || '').trim().slice(0, 120)
    };
  }

  async function explore(regionId, intent = '') {
    if (busy) return { type: 'error', text: '上一次探索仍在结算。' };
    busy = true;
    try {
      await Promise.all([root.GameInventory.ready(), root.GameCultivation.ready(), root.GameAffinity.ready()]);
      const region = regions.get(regionId);
      if (!region) return withIntent(
        { type: 'error', text: '未找到该探索区域。' },
        intent
      );
      if (root.GameCultivation.getSnapshot().realmIndex < Number(region.required_realm)) {
        return withIntent(
          { type: 'locked', text: '当前境界尚不足以进入此地。' },
          intent
        );
      }
      if (!consumeStamina(region)) {
        return withIntent(
          { type: 'stamina', text: '精力不足，无法继续出山。' },
          intent
        );
      }
      const rareRoll = Math.random();
      if (rareRoll < 0.05) {
        return withIntent(
          await rarePillEncounter('divine_cultivation_pill'),
          intent
        );
      }
      if (rareRoll < 0.20) {
        return withIntent(
          await rarePillEncounter('holy_cultivation_pill'),
          intent
        );
      }
      const encounterRoll = Math.random();
      if (encounterRoll < 0.24) {
        return withIntent(await npcEncounter(region), intent);
      }
      if (encounterRoll < 0.58) {
        return withIntent(battleEncounter(region), intent);
      }
      if (encounterRoll < 0.98) {
        return withIntent(await curioEncounter(region), intent);
      }
      return withIntent({ type: 'nothing', text: '一路风平浪静，无事发生。' }, intent);
    } finally {
      busy = false;
    }
  }

  async function completeBattle(encounter) {
    const enemy = encounter?.enemy;
    if (!enemy) return { text: '战斗奖励结算失败。' };
    const cultivation = await root.GameCultivation.addCultivation(enemy.cultivation_reward, 'battle');
    const extraLoot = hasTalent('battle_hunter') && Math.random() < 0.35 ? 1 : 0;
    const loot = await root.GameInventory.add(enemy.loot_id, 1 + extraLoot, 'battle');
    const stones = Math.max(0, Math.floor(Number(enemy.stone_reward) || 0));
    const stoneResult = stones > 0
      ? await root.GameInventory.addSpiritStones(stones, 'battle')
      : persistence.result('灵石奖励', false, true, { balance: root.GameInventory.getSpiritStones() });
    const itemName = loot.item?.name || '战利品';
    const gainText = cultivation.changed ? `修为 +${cultivation.gain}` : '修为已达瓶颈';
    return persistence.combine('战斗奖励', [cultivation, loot, stoneResult], {
      text: `战斗胜利！${gainText}，获得${itemName} ×${1 + extraLoot}、灵石 ${stones}。`,
      cultivation,
      loot,
      stoneResult,
      spiritStones: stones
    });
  }

  root.GameExploration = {
    initialize,
    getRegions,
    explore,
    completeBattle,
    isBusy: () => busy
  };
}(window));
