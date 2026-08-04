(function installTournamentOutput(root) {
  'use strict';

  const FIELD_NAMES = [
    'verdictReason',
    'playerDelta',
    'opponentDelta',
    'matchResult',
    'relationshipChanges'
  ];

  function cleanRaw(value) {
    return String(value || '')
      .trim()
      .slice(0, 12000)
      .replace(/^```(?:json|javascript|text)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  function parseJsonObject(value) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function findJson(value) {
    const direct = parseJsonObject(value);
    if (direct) return direct;
    for (let start = value.indexOf('{'); start >= 0; start = value.indexOf('{', start + 1)) {
      for (let end = value.lastIndexOf('}'); end > start; end = value.lastIndexOf('}', end - 1)) {
        const parsed = parseJsonObject(value.slice(start, end + 1));
        if (parsed) return parsed;
      }
    }
    return null;
  }

  function plainText(value) {
    let prose = value
      .replace(/^(?:response|正文|回复|对手回应)\s*[:：]\s*/i, '')
      .trim();
    const metadata = new RegExp(`\\n\\s*(?:${FIELD_NAMES.join('|')})\\s*[:：]`, 'i');
    const metadataIndex = prose.search(metadata);
    if (metadataIndex >= 0) prose = prose.slice(0, metadataIndex).trim();
    return prose
      .replace(/^\s*[-*]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function hasResponse(object) {
    return ['response', 'summary', 'narration', 'opponentAction', 'globalCommentary']
      .some((key) => typeof object?.[key] === 'string' && object[key].trim().length >= 8);
  }

  function parse(raw) {
    const cleaned = cleanRaw(raw);
    if (!cleaned) return null;
    const object = findJson(cleaned);
    if (object && hasResponse(object)) {
      return { source: 'ai-json', value: object };
    }
    const response = plainText(cleaned);
    if (response.length < 20 || /^[\[{]/.test(response)) return null;
    return { source: 'ai-text', value: { response } };
  }

  root.GameTournamentOutput = Object.freeze({ parse });
}(window));
