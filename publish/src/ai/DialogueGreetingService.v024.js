(function installDialogueGreetingService(root) {
  'use strict';

  function clean(text, fallback) {
    return root.GameAIText.limit(root.GameAIText.clean(text, fallback), 240);
  }

  function returnFallback(affinity, npc) {
    const address = root.GameNPCRelations.address(npc);
    const lines = {
      '戒备': `${address}，你又来了？若有正事，便直说。`,
      '初识': `${address}，还有何事？我且听你说来。`,
      '熟悉': `${address}，你又回来了，可是方才还有话未说完？`,
      '亲近': `${address}，才别片刻便又来寻我，是有什么话想说？`,
      '信赖': `${address}，我便知道你还会回来，坐下慢慢说吧。`,
      '倾心': `${address}，你既回到我身边，未尽之言便都说与我听吧。`
    };
    return lines[affinity.relationship] || lines['初识'];
  }

  async function generate({ completions, session, affinity, returning, onUpdate }) {
    const fallback = returning ? returnFallback(affinity, session.npc) : session.fallbackOpening;
    const messages = returning
      ? root.GameDialoguePrompts.reentry(session, affinity)
      : [{ role: 'user', content: root.GameDialoguePrompts.opening(
          session.npc, session.building, affinity
        ) }];
    let finalText = '';
    try {
      const result = await completions.run({
        messages,
        maxTokens: returning ? 220 : 340,
        timeoutFallback: fallback,
        onUpdate(fullText) {
          finalText = clean(fullText, fallback);
          onUpdate?.(finalText);
        },
        onDone(fullText) {
          finalText = clean(fullText, fallback);
          onUpdate?.(finalText);
        }
      });
      return {
        text: clean(finalText || result.text, fallback),
        failed: result.reason === 'busy'
      };
    } catch (error) {
      console.error('AI 问候生成失败:', error.code || '', error.message, error.stack);
      return { text: fallback, failed: true };
    }
  }

  root.GameDialogueGreetings = Object.freeze({ generate });
}(window));
