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

  function selectedOpponent() {
    if (elements['tournament-draw-mode'].value !== 'tamper') return '';
    const opponentId = elements['tournament-opponent-select'].value;
    if (!opponentId) throw new Error('请选择要通过篡改签文锁定的对手');
    return opponentId;
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
    let opponentId = '';
    try {
      opponentId = selectedOpponent();
    } catch (error) {
      render(errorMessage(error, '请选择对手'));
      return;
    }
    await run(
      () => root.GameTournament.start(mode, opponentId),
      opponentId ? '正在篡改首轮签文并重排十二人对阵…' : '护山钟声响起，正在抽取十二人签表…'
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
    render('AI 正在续写战况并进行点数判决，约需 10–30 秒…');
    elements['tournament-action-input'].value = '';
    try {
      const result = await root.GameTournamentJudge.judge(active, move, state());
      await root.GameTournament.recordExchange(move, result);
      root.GameAudio?.sfx?.(result.winner === 'opponent' ? 'deny' : 'success');
      if (generation === openGeneration && !elements['tournament-screen'].hidden) {
        finalStatus = result.fallback ? result.fallbackMessage : '本回合战况与裁判点数已更新。';
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
    let opponentId = '';
    try {
      opponentId = selectedOpponent();
    } catch (error) {
      render(errorMessage(error, '请选择对手'));
      return;
    }
    await run(
      () => root.GameTournament.advanceRound(opponentId),
      opponentId ? '正在篡改下一轮签文…' : '正在开启下一轮签表…'
    );
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
    elements['tournament-draw-mode'].addEventListener('change', () => render());
    elements['tournament-opponent-select'].addEventListener('change', () => render());
    elements['tournament-action-input'].addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    });
  }

  root.GameTournamentPanel = Object.freeze({ init, open, close });
}(window));
