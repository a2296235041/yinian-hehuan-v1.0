(function installTournamentImage(root) {
  'use strict';

  function opponent(active) {
    const id = active?.opponentIds?.[0];
    return root.GameTournamentRoster.getProfile(id, active?.roster);
  }

  function sceneMessages(active) {
    return (active?.logs || [])
      .filter((entry) => entry?.speaker === '你' || entry?.kind === 'opponent-response')
      .slice(-6)
      .map((entry) => ({
        role: entry.speaker === '你' ? 'user' : 'assistant',
        content: String(entry.text || '')
      }))
      .filter((message) => message.content);
  }

  function sessionFor(active) {
    if (!active || active.phase !== 'battle') return null;
    const profile = opponent(active);
    if (!profile) return null;
    const messages = sceneMessages(active);
    if (!messages.length && active.battleSummary) {
      messages.push({ role: 'assistant', content: String(active.battleSummary) });
    }
    return {
      npc: {
        ...profile,
        description: [profile.appearance, profile.physique, profile.combat_style]
          .filter(Boolean)
          .join(' ')
      },
      building: {
        id: 'tournament-arena',
        name: active.mode === 'spirit'
          ? 'Spirit Realm Martial Arts Tournament arena'
          : 'Hehuan Sect tournament arena'
      },
      messages
    };
  }

  async function generate(active) {
    const session = sessionFor(active);
    if (!session?.messages.length) {
      root.Game.EventBus.emit('ai-image-status', {
        status: 'error',
        message: '至少完成一次交锋后才能绘制此刻。'
      });
      return false;
    }
    await root.GameAIImage.generate(session);
    return true;
  }

  root.GameTournamentImage = Object.freeze({ generate, sessionFor });
}(window));
