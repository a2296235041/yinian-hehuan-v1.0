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

  root.GameAIText = Object.freeze({ clean });
}(window));
