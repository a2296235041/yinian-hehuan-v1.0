(function installTournamentAttitude(root) {
  'use strict';

  const lines = Object.freeze({
    steadfast: '她仍保持克制疏离，措辞正式，目光警惕地守着彼此距离。',
    wavering: '她的强硬语气间出现迟疑，羞恼与额外关注已经难以完全掩住。',
    fallen: '她对你的关注明显压过胜负心，语气更坦率，动作也主动贴近你的节奏。',
    devoted: '她毫不掩饰对你的热切与顺从，主动迎合你的节奏，把追随你置于胜负之前。'
  });

  function fallbackLine(payload) {
    if (payload?.mode !== 'spirit') return '';
    return (payload.currentRelations || []).map((relation, index) => {
      const line = lines[relation?.stage];
      const name = payload.opponents?.[index]?.name || '她';
      return line ? `${name}${line.slice(1)}` : '';
    }).filter(Boolean).join('');
  }

  root.GameTournamentAttitude = Object.freeze({ fallbackLine });
}(window));
