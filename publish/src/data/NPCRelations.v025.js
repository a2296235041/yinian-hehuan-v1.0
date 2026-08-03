(function installNPCRelations(root) {
  'use strict';

  const byId = new Map();
  const byName = new Map();

  function register(npcs) {
    byId.clear();
    byName.clear();
    (npcs || []).forEach((npc) => {
      if (!npc?.id || !npc?.name) return;
      byId.set(npc.id, npc);
      byName.set(npc.name, npc);
    });
  }

  function address(npc) {
    const key = root.GamePlayerIdentity.isFemale() ? 'player_address_female' : 'player_address';
    return String(npc?.[key] || npc?.player_address || '新弟子').trim() || '新弟子';
  }

  function relation(npc) {
    const key = root.GamePlayerIdentity.isFemale() ? 'player_relation_female' : 'player_relation';
    return String(npc?.[key] || npc?.player_relation || '宗门前辈与刚入宗的新弟子').trim();
  }

  function promptRule(npc) {
    return [
      `你与玩家的身份关系是：${relation(npc)}。`,
      `你对玩家唯一固定的常用称呼是“${address(npc)}”。`,
      '需要称呼玩家时只能使用该称呼，也可以自然省略称呼。',
      '好感度只改变语气和亲疏，不改变玩家刚入宗的身份、宗门辈分或固定称呼。',
      '即使旧对话中出现过其他称呼，从当前回复起也必须改用这一固定称呼。'
    ].join('');
  }

  root.GameNPCRelations = Object.freeze({
    register,
    address,
    relation,
    promptRule,
    getById: (id) => byId.get(String(id || '')) || null,
    getByName: (name) => byName.get(String(name || '')) || null
  });
}(window));
