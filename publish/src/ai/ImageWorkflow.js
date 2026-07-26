(function installImageWorkflowRecipe(root) {
  'use strict';

function createImageWorkflow({ dzmmRef = () => root.dzmm, buildPrompt, onStatus } = {}) {
  if (typeof buildPrompt !== 'function') throw new Error('createImageWorkflow requires buildPrompt');
  let jobSeq = 0;
  let inFlight = null;

  function runPaidJob(status, execute) {
    if (inFlight) {
      return Promise.resolve({ ignored: true, image: null, reason: 'busy' });
    }
    const seq = ++jobSeq;
    onStatus?.(status);
    const task = Promise.resolve()
      .then(execute)
      .then((result) => {
        if (seq !== jobSeq) return { ignored: true, image: null, reason: 'cancelled' };
        const image = result?.images?.[0] || result?.image || null;
        onStatus?.(image ? 'ready' : 'empty');
        return { ignored: false, image };
      })
      .catch((error) => {
        if (seq !== jobSeq) return { ignored: true, image: null, reason: 'cancelled' };
        onStatus?.('error');
        throw error;
      })
      .finally(() => {
        if (inFlight === task) inFlight = null;
      });
    inFlight = task;
    return task;
  }

  async function generate(options) {
    const prompt = buildPrompt(options);
    const result = await runPaidJob('generating', () => {
      const draw = dzmmRef()?.draw;
      if (typeof draw?.generate !== 'function') throw new Error('dzmm.draw.generate 不可用');
      return draw.generate({
        prompt,
        dimension: options?.dimension || '1:1',
        model: options?.model,
        negativePrompt: options?.negativePrompt,
      });
    });
    return result.ignored ? result : { ...result, prompt };
  }

  async function edit({ sourceImage, instruction, dimension = '1:1' }) {
    return runPaidJob('editing', () => {
      const draw = dzmmRef()?.draw;
      if (typeof draw?.edit !== 'function') throw new Error('dzmm.draw.edit 不可用');
      return draw.edit({
        images: [sourceImage],
        prompt: instruction,
        dimension,
      });
    });
  }

  function cancel() {
    jobSeq += 1;
    onStatus?.('cancelled');
  }

  return { generate, edit, cancel, isBusy: () => Boolean(inFlight) };
}

  const recipes = root.GamefyRecipes || (root.GamefyRecipes = {});
  recipes.createImageWorkflow = createImageWorkflow;
}(typeof window !== 'undefined' ? window : globalThis));
