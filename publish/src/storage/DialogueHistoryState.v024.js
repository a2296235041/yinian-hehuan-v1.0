(function installDialogueHistoryState(root) {
  'use strict';

  const sessions = new Map();
  const ID_PATTERN = /^[a-z0-9_-]{1,64}$/i;
  const MAX_NPCS = 30;
  const MAX_MESSAGES_PER_NPC = 14;
  const MAX_TOTAL_CHARACTERS = 300000;

  function cleanText(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
  }

  function sanitize(value) {
    const clean = { sessions: {} };
    let remaining = MAX_TOTAL_CHARACTERS;
    const source = value?.sessions && typeof value.sessions === 'object'
      ? value.sessions
      : {};
    Object.entries(source).slice(0, MAX_NPCS).forEach(([npcId, session]) => {
      if (!ID_PATTERN.test(npcId) || remaining <= 0 || !Array.isArray(session?.messages)) return;
      const messages = [];
      const recent = session.messages.slice(-MAX_MESSAGES_PER_NPC);
      for (let index = recent.length - 1; index >= 0 && remaining > 0; index -= 1) {
        const message = recent[index];
        if (message?.role !== 'user' && message?.role !== 'assistant') continue;
        const content = cleanText(message.content, 500);
        if (!content || content.length > remaining) continue;
        const next = { role: message.role, content };
        remaining -= content.length;
        const promptContent = message.role === 'user'
          ? cleanText(message.promptContent, 1200)
          : '';
        if (promptContent && promptContent !== content && promptContent.length <= remaining) {
          next.promptContent = promptContent;
          remaining -= promptContent.length;
        }
        messages.unshift(next);
      }
      if (messages.length) clean.sessions[npcId] = { messages };
    });
    return clean;
  }

  function exportState() {
    const raw = { sessions: {} };
    sessions.forEach((session, npcId) => {
      raw.sessions[npcId] = { messages: session.messages || [] };
    });
    return sanitize(raw);
  }

  function restoreState(value) {
    sessions.clear();
    const clean = sanitize(value);
    Object.entries(clean.sessions).forEach(([npcId, session]) => {
      sessions.set(npcId, { messages: session.messages });
    });
    return clean;
  }

  function clear() {
    sessions.clear();
  }

  root.GameDialogueHistory = Object.freeze({
    sessions,
    maxMessagesPerNpc: MAX_MESSAGES_PER_NPC,
    sanitize,
    exportState,
    restoreState,
    clear
  });
}(window));
