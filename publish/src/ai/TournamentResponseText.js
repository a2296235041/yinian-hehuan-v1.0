(function installTournamentResponseText(root) {
  'use strict';

  const MAX_LENGTH = 320;
  const MIN_LENGTH = 150;

  function compact(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function clean(value) {
    const source = compact(value);
    if (source.length <= MAX_LENGTH) return source;
    for (let index = MAX_LENGTH - 1; index >= MIN_LENGTH; index -= 1) {
      if (!/[。！？!?]/.test(source[index])) continue;
      let end = index + 1;
      while (/[”’」』】）)]/.test(source[end] || '')) end += 1;
      return source.slice(0, end);
    }
    return `${source.slice(0, MAX_LENGTH - 1)}…`;
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
      `${names}的呼吸、目光与细微神情仍延续着方才的变化，她没有立刻移开注意，只让尚未说尽的情绪继续停留在你们之间。`,
      `她接下来的话语贴着此刻的距离与气氛落下，声音轻重随着当下处境变化，动作则保持克制，等待你决定下一步。`,
      '看台近处只传来几声压低的议论，很快便重新安静下来，没有打断你们之间仍在继续的回应。'
    ];
  }

  function ensure(value, payload, outcome) {
    let response = compact(value);
    const additions = continuation(payload, outcome);
    for (let index = 0; response.length < MIN_LENGTH && index < additions.length; index += 1) {
      response += additions[index];
    }
    if (response.length < MIN_LENGTH) {
      response += `${opponentNames(payload)}仍把注意力放在你身上，未说尽的话与细微动作维持着此刻的气氛，停在等待你继续回应的位置。`;
    }
    return clean(response);
  }

  root.GameTournamentResponseText = Object.freeze({
    ensure,
    minLength: MIN_LENGTH,
    maxLength: MAX_LENGTH
  });
}(window));
