(function installAITextSanitizer(root) {
  'use strict';

  const notePrefix = '(?:注|说明|备注|提示|字数说明)';

  function clean(text, fallback = '') {
    let value = String(text || '').replace(/\r/g, '').trim();
    value = value.replace(
      new RegExp(`[（(]\\s*${notePrefix}\\s*[：:][^）)]*[）)]`, 'gi'),
      ''
    );
    value = value.replace(
      new RegExp(`[（(]\\s*${notePrefix}\\s*[：:][\\s\\S]*$`, 'i'),
      ''
    );
    value = value.split('\n').filter((line) => {
      const current = line.trim();
      if (!current) return true;
      if (new RegExp(`^[（(]?\\s*${notePrefix}\\s*[：:]`, 'i').test(current)) return false;
      return !/(?:字数|字以内|长度限制).*(?:要求|限制|超出|约为)/.test(current);
    }).join('\n').trim();
    value = value.replace(/^(?:回复|回答|台词|开场白|角色回应)\s*[：:]\s*/i, '');
    value = value.replace(/^["“]|["”]$/g, '').trim();
    return value || String(fallback || '').trim();
  }

  function limit(text, maxCharacters = 240) {
    const value = String(text || '').trim();
    if (value.length <= maxCharacters) return value;
    const clipped = value.slice(0, maxCharacters);
    const punctuation = /[。！？!?；;]/g;
    let match;
    let lastEnd = -1;
    while ((match = punctuation.exec(clipped))) lastEnd = match.index + 1;
    const cutoff = lastEnd >= Math.floor(maxCharacters * 0.65)
      ? lastEnd : maxCharacters;
    return clipped.slice(0, cutoff).trim();
  }

  root.GameAIText = Object.freeze({ clean, limit });
}(window));
