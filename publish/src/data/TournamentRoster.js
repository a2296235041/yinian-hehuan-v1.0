(function installTournamentRoster(root) {
  'use strict';

  const PLAYER_ID = 'player';

  function shuffle(items, random = Math.random) {
    const result = items.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function cacheData(key) {
    try {
      const scene = root.game?.scene?.getScene('GameScene');
      return scene?.cache?.json?.get(key) || [];
    } catch (_) {
      return [];
    }
  }

  function existingProfile(npc) {
    const realm = Math.max(0, Math.floor(Number(npc.realm_index) || 0));
    return {
      id: npc.id,
      group: 'internal',
      name: npc.name,
      faction: '合欢宗',
      title: npc.title,
      adult: true,
      appearance: `${npc.title}，${npc.physique || '体态各异'}，已有宗门立绘可供展示。`,
      physique: npc.physique || '体态各异',
      personality: npc.personality || '性情沉静',
      combat_style: `${npc.title}一脉的合欢宗秘术，擅长因势制宜。`,
      signature_move: `${npc.name}秘传`,
      power: Math.min(96, 50 + realm * 6),
      portrait_key: `npc-${String(npc.id).replaceAll('_', '-')}`
    };
  }

  function newProfiles(group) {
    return cacheData('tournament_npcs')
      .filter((npc) => npc?.group === group)
      .map((npc) => ({ ...npc }));
  }

  function internalPool() {
    const existing = cacheData('npcs').map(existingProfile);
    return existing.concat(newProfiles('internal'));
  }

  function externalPool() {
    return newProfiles('external');
  }

  function playerProfile() {
    const stats = root.GamePlayerStats?.getSnapshot?.() || {};
    const score = 48
      + Math.floor(Number(stats.realmIndex) || 0) * 7
      + Math.floor(((Number(stats.strength) || 50) + (Number(stats.agility) || 50)) / 20);
    return {
      id: PLAYER_ID,
      group: 'player',
      name: '你',
      faction: '合欢宗',
      title: stats.originName || '合欢宗弟子',
      adult: true,
      appearance: '由玩家当前身份与立绘决定。',
      physique: '由玩家当前身份决定',
      personality: '由玩家在比试中的言行决定',
      combat_style: '不拘一格，一切招式与战术均由玩家亲自描述。',
      signature_move: '由玩家自创',
      power: Math.max(45, Math.min(98, score)),
      realm: stats.realmLabel || '炼气初期'
    };
  }

  function build(mode, random = Math.random) {
    const pool = mode === 'spirit' ? externalPool() : internalPool();
    if (pool.length < 11) throw new Error('赛事 NPC 数量不足，无法组成十二人签表');
    return [playerProfile(), ...shuffle(pool, random).slice(0, 11)];
  }

  root.GameTournamentRoster = Object.freeze({
    PLAYER_ID,
    build,
    getCandidates(mode) {
      return mode === 'spirit' ? externalPool() : internalPool();
    },
    getProfile(id, roster) {
      return (roster || []).find((entry) => entry.id === id) || null;
    }
  });
}(window));
