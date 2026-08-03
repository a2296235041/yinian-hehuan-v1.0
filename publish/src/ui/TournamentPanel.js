(function installTournamentPanel(root) {
  'use strict';

  let elements = null;
  let mode = 'internal';
  let busy = false;
  let openGeneration = 0;

  function state() {
    return root.GameTournament.getState();
  }

  function render(status = '') {
    root.GameTournamentView.render(state(), mode, { busy, status });
  }

  function errorMessage(error, fallback) {
    const message = error?.message || fallback;
    console.error('赛事操作失败:', error?.code || '', message, error?.stack || '');
    root.GameAudio?.sfx?.('deny');
    return message;
  }

  async function run(action, loadingText) {
    if (busy) return;
    busy = true;
    render(loadingText);
    let finalStatus = '';
    try {
      await action();
    } catch (error) {
      finalStatus = errorMessage(error, '赛事操作失败，请稍后重试');
    } finally {
      busy = false;
      render(finalStatus);
    }
  }

  async function start() {
    await run(
      () => root.GameTournament.start(mode),
      '护山钟声响起，正在抽取十二人签表…'
    );
    root.GameAudio?.sfx?.('success');
  }

  async function submit() {
    if (busy) return;
    const move = elements['tournament-action-input'].value.trim();
    if (move.length < 2) {
      render('请先描述你要施展的招式或战术。');
      return;
    }
    const active = state().active;
    if (!active || active.mode !== mode || active.phase !== 'battle') return;
    const generation = openGeneration;
    busy = true;
    let finalStatus = '';
    render('裁判正在推演招式碰撞，约需 10–30 秒…');
    elements['tournament-action-input'].value = '';
    try {
      const result = await root.GameTournamentJudge.judge(active, move);
      await root.GameTournament.recordExchange(move, result);
      root.GameAudio?.sfx?.(result.winner === 'opponent' ? 'deny' : 'success');
      if (generation === openGeneration && !elements['tournament-screen'].hidden) {
        finalStatus = result.fallback ? result.fallbackMessage : 'AI 已延伸并更新整场战局。';
      }
    } catch (error) {
      if (generation === openGeneration) {
        finalStatus = errorMessage(error, '本回合未能完成，请重新出招');
      }
    } finally {
      busy = false;
      if (generation === openGeneration && !elements['tournament-screen'].hidden) {
        render(finalStatus);
      }
    }
  }

  async function advance() {
    await run(() => root.GameTournament.advanceRound(), '正在开启下一轮签表…');
    root.GameAudio?.sfx?.('success');
  }

  async function claim() {
    await run(() => root.GameTournament.claimReward(), '正在发放魁首奖励…');
    root.GameAudio?.sfx?.('score');
  }

  async function finish() {
    await run(() => root.GameTournament.abandonCompleted(), '正在收录本届赛事结果…');
  }

  function open(nextMode) {
    mode = nextMode === 'spirit' ? 'spirit' : 'internal';
    openGeneration += 1;
    elements['tournament-screen'].hidden = false;
    root.GameModelUI?.setMode?.('hidden');
    render();
    root.GameAudio?.sfx?.('click');
  }

  function close() {
    openGeneration += 1;
    elements['tournament-screen'].hidden = true;
    root.GameModelUI?.setMode?.('compact');
    root.GameAudio?.sfx?.('click');
  }

  function init() {
    elements = root.GameTournamentView.init();
    document.getElementById('tournament-close').addEventListener('click', close);
    elements['tournament-start'].addEventListener('click', start);
    elements['tournament-submit'].addEventListener('click', submit);
    elements['tournament-advance'].addEventListener('click', advance);
    elements['tournament-claim'].addEventListener('click', claim);
    elements['tournament-finish'].addEventListener('click', finish);
    elements['tournament-action-input'].addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    });
  }

  root.GameTournamentPanel = Object.freeze({ init, open, close });
}(window));
