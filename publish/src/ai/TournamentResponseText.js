(function installTournamentResponseText(root) {
  'use strict';

  const MAX_LENGTH = 240;
  const MIN_LENGTH = 150;

  function clean(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTH);
  }

  function opponentNames(payload) {
    return (payload.opponents || []).map((item) => item.name).filter(Boolean).join('与') || '对手';
  }

  function continuation(payload, outcome) {
    const names = opponentNames(payload);
    if (outcome.finished && outcome.winner === 'player') {
      return [
        `${names}缓缓收住架势，目光仍落在你身上，片刻后才低声说道：“这一场是你赢了，我认。”`,
        `她没有回避方才交锋留下的影响，只将气息重新压稳，随后向你郑重行礼，把胜负与未尽之意一并留在擂台上。`,
        '看台上的喝彩只短暂掠过，她仍停在原地等着你的回应，神情与动作没有脱离这场刚刚结束的交锋。'
      ];
    }
    if (outcome.finished && outcome.winner === 'opponent') {
      return [
        `${names}稳稳守住最后的优势，抬眼直视着你说道：“胜负已经分明，但你的手段我会记住。”`,
        `她收势后仍未立刻转身，神情里既有戒备也有审视，像是在等你亲口回应这场已经落定的结果。`,
        '四周的议论声并未让她分神，她只向你略一颔首，将最后的态度清楚留在彼此之间。'
      ];
    }
    return [
      `${names}没有让这段交锋停在沉默里，她重新锁定你的气机，沉声说道：“还没结束，下一步我会亲自接住。”`,
      `话音未落，她便调整呼吸与站位，动作紧接着方才的局面展开，目光始终没有离开你，也不给彼此留下脱离对峙的空隙。`,
      '看台近处只传来几声压低的议论，很快又被双方重新逼近的气势盖过。'
    ];
  }

  function ensure(value, payload, outcome) {
    let response = clean(value);
    const additions = continuation(payload, outcome);
    for (let index = 0; response.length < MIN_LENGTH && index < additions.length; index += 1) {
      response += additions[index];
    }
    if (response.length < MIN_LENGTH) {
      response += `${opponentNames(payload)}仍把注意力完全放在你身上，手中招式与未说尽的话都没有停下，下一刻的动作继续沿着你们刚刚形成的局面向前推进。`;
    }
    return clean(response);
  }

  root.GameTournamentResponseText = Object.freeze({
    ensure,
    minLength: MIN_LENGTH,
    maxLength: MAX_LENGTH
  });
}(window));
