(function installPrivateGroupPrompts(root) {
  'use strict';

  const RESPONSE_TYPES = new Set(['dialogue', 'action']);

  function text(value, maxLength) {
    return String(value || '').trim().slice(0, maxLength);
  }

  function sessionId(companions) {
    const source = companions.map((npc) => npc.id).sort().join('|');
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `private_group_${(hash >>> 0).toString(36)}`;
  }

  function validate(value, companionIds) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.responses)) return false;
    if (value.responses.length < 1 || value.responses.length > companionIds.length) return false;
    if (typeof value.sceneBeat !== 'string' || value.sceneBeat.length > 60) return false;
    const allowed = new Set(companionIds);
    const used = new Set();
    return value.responses.every((response) => {
      if (!response || typeof response !== 'object') return false;
      if (!allowed.has(response.speakerId) || used.has(response.speakerId)) return false;
      used.add(response.speakerId);
      return RESPONSE_TYPES.has(response.type)
        && typeof response.content === 'string'
        && response.content.trim().length >= 1
        && response.content.length <= 100;
    });
  }

  function fallback(companions, playerText) {
    const intent = text(playerText, 24) || '方才的话';
    return {
      sceneBeat: '几人交换目光，顺着此刻的气氛自然接过了话头。',
      responses: companions.map((npc, index) => ({
        speakerId: npc.id,
        type: index % 2 === 0 ? 'dialogue' : 'action',
        content: index % 2 === 0
          ? `${npc.name}回应了你关于“${intent}”的意思，也留意着其他人的反应。`
          : `${npc.name}略作思量，以一个符合她性情的举动回应了你。`
      }))
    };
  }

  function instructions(companions, location) {
    const player = root.GamePlayerIdentity.get();
    const profiles = companions.map((npc) => {
      const affinity = root.GameAffinity.getSnapshot(npc.id);
      return {
        id: npc.id,
        name: npc.name,
        title: npc.title,
        realm: npc.realm_label,
        personality: npc.personality,
        relationship: affinity.relationship,
        affinity: affinity.affinity,
        addressRule: root.GameNPCRelations.promptRule(npc)
      };
    });
    return [
      '你负责合欢宗私人场景中的多人互动。所有受邀伴侣均为成年女性角色。',
      `地点：${location.name}。玩家身份：${player.role}。`,
      `参与角色：${JSON.stringify(profiles)}。`,
      player.intimacyRule,
      '根据玩家本轮对白或行动判断应由一人、两人或全部角色回应。',
      '玩家明确面向众人、发起共同活动或行动影响所有人时，应让全部角色分别回应。',
      '每名角色必须保持自己的性格、身份、称呼与关系程度，角色之间也可互相接话。',
      '不得替玩家决定后续行动，不修改好感、修为、物品或任何游戏数值。',
      '输出对象格式：{"sceneBeat":"环境或众人反应，不超过60字","responses":[',
      '{"speakerId":"只能使用参与角色id","type":"dialogue或action","content":"不超过100字"}]}。',
      'responses 中角色不可重复，数量为1至参与人数；不要输出额外字段。'
    ].join('');
  }

  function userText(session, playerText) {
    const history = session.messages.slice(-10).map((message) => ({
      role: message.role,
      content: text(message.promptContent || message.content, 500)
    }));
    return `最近多人会话：${JSON.stringify(history)}\n玩家本轮输入：${text(playerText, 500)}`;
  }

  function format(value, companions) {
    const names = new Map(companions.map((npc) => [npc.id, npc.name]));
    const lines = value.sceneBeat ? [`[scene]${text(value.sceneBeat, 60)}`] : [];
    value.responses.forEach((response) => {
      const name = names.get(response.speakerId);
      if (!name) return;
      lines.push(`[npc:${response.speakerId}:${response.type}]${text(response.content, 100)}`);
    });
    return lines.join('\n').slice(0, 500);
  }

  function parse(content, companions) {
    const names = new Map(companions.map((npc) => [npc.id, npc.name]));
    return String(content || '').split('\n').map((line) => {
      if (line.startsWith('[scene]')) return { kind: 'scene', content: line.slice(7) };
      const match = line.match(/^\[npc:([a-z0-9_-]+):(dialogue|action)\](.+)$/i);
      if (!match || !names.has(match[1])) return { kind: 'scene', content: line };
      return {
        kind: 'response',
        speakerId: match[1],
        speakerName: names.get(match[1]),
        type: match[2],
        content: match[3]
      };
    }).filter((entry) => entry.content);
  }

  function opening(companions, location) {
    return `[scene]${companions.map((npc) => npc.name).join('、')}已应邀来到${location.name}，接下来的言行由你决定。`;
  }

  root.GamePrivateGroupPrompts = Object.freeze({
    sessionId,
    validate,
    fallback,
    instructions,
    userText,
    format,
    parse,
    opening
  });
}(window));
