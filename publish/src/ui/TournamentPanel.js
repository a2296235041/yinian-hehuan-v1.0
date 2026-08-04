(function installTournamentPanel(root) {
  'use strict';

  let elements = null;
  let mode = 'internal';
  let busy = false;
  let drawing = false;
  let openGeneration = 0;

  function state() {
    return root.GameTournament.getState();
  }

  function render(status = '') {
    const imageBusy = drawing || root.GameAIImage?.isBusy?.() === true;
    root.GameTournamentView.render(state(), mode, { busy, drawing: imageBusy, status });
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
    let result = null;
    try {
      result = await action();
    } catch (error) {
      finalStatus = errorMessage(error, '赛事操作失败，请稍后重试');
    } finally {
      busy = false;
      render(finalStatus);
    }
    return result;
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
    render('AI 正在生成对手回应并进行点数判决，约需 10–30 秒…');
    elements['tournament-action-input'].value = '';
    try {
      const result = await root.GameTournamentJudge.judge(active, move, state());
      const updated = await root.GameTournament.recordExchange(move, result);
      root.GameAudio?.sfx?.(result.winner === 'opponent' ? 'deny' : 'success');
      if (generation === openGeneration && !elements['tournament-screen'].hidden) {
        finalStatus = updated.active?.turn >= root.GameTournamentDecision.MIN_TURNS
          ? `已完成 ${updated.active.turn} 回合，可继续出招或请求裁判判决。`
          : (result.fallback
          ? result.fallbackMessage
          : (result.source === 'ai-text'
            ? '已采用 AI 正文，裁判点数由赛事规则补全。'
            : '对手回应与裁判点数已更新。'));
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

  async function decide() {
    const updated = await run(
      () => root.GameTournament.requestDecision(),
      '裁判正在核算累计点数并作出本轮终判…'
    );
    const active = updated?.active;
    root.GameAudio?.sfx?.(
      active?.phase === 'round_complete' || active?.playerWon ? 'success' : 'deny'
    );
  }

  async function drawMoment() {
    if (busy || drawing) return;
    const active = state().active;
    if (!active || active.mode !== mode || active.phase !== 'battle') return;
    const generation = openGeneration;
    let finalStatus = '';
    drawing = true;
    render('正在提炼最近交锋并绘制当前场景，预计约 30 秒…');
    root.GameAudio?.sfx?.('click');
    try {
      await root.GameTournamentImage.generate(active);
    } catch (error) {
      if (generation === openGeneration) {
        finalStatus = errorMessage(error, '当前场景绘制失败，请稍后再次点击');
      }
    } finally {
      drawing = false;
      if (generation === openGeneration && !elements['tournament-screen'].hidden) render(finalStatus);
    }
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
    elements['tournament-draw-moment'].addEventListener('click', drawMoment);
    elements['tournament-decision'].addEventListener('click', decide);
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
