(function installNPCGiftInteraction(root) {
  'use strict';

  const failedMessages = {
    busy: '赠礼正在处理中，请稍候。',
    daily_limit: '今日已经赠送过礼物了。',
    insufficient: '这件物品的数量不足。',
    invalid_item: '这件物品无法赠送。'
  };

  function resultMessage(result) {
    if (!result.changed) return failedMessages[result.reason] || '赠礼失败，请稍后重试。';
    root.GamePersistenceStatus?.report?.('赠礼', result);
    return `赠送${result.item.name}，好感 +${result.gain}` +
      `${result.syncMessage ? `，${result.syncMessage}` : ''}`;
  }

  function interactionPrompt(session, result, message) {
    const item = result.item;
    if (result.changed) {
      return [
        `情境：玩家刚向你赠送了${item.name}。`,
        `礼物特点：${item.description || '一件用心准备的礼物'}。`,
        `系统已确定好感增加${result.gain}，当前关系是`,
        `${result.snapshot?.relationship || '初识'}。`,
        '请结合你的身份、性格和关系，以角色口吻自然回应这次赠礼。'
      ].join('');
    }
    return [
      `情境：玩家尝试向你赠礼，但实际结果是“${message}”。`,
      '不要假装已经收到礼物，请结合你的性格与当前关系自然回应或化解尴尬。'
    ].join('');
  }

  async function handle({ session, itemId, isCurrent, sendMessage }) {
    const result = await root.GameGift.give(session.npc.id, itemId);
    if (!isCurrent()) return;
    const message = resultMessage(result);
    if (result.snapshot) {
      root.Game.EventBus.emit('affinity-notice', {
        snapshot: result.snapshot,
        message
      });
    }
    root.GameAudio.sfx(result.changed ? 'success' : 'deny');
    const display = result.changed && result.item
      ? `你赠送了${result.item.name}。`
      : `你尝试赠礼，但${message}`;
    await sendMessage(interactionPrompt(session, result, message), {
      displayContent: display,
      affinityEligible: false,
      successMessage: message
    });
  }

  root.GameNPCGiftInteraction = { handle };
}(window));
