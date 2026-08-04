(function installTournamentVerdict(root) {
  'use strict';

  const hiddenRulePattern = /(未主动认输|未认输|未求饶|认输或求饶|判定规则|一律判|玩家有效)/;

  function sentence(value) {
    const reason = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!reason) return '';
    return /[。！？!?]$/.test(reason) ? reason : `${reason}。`;
  }

  function usable(value, outcome) {
    const reason = sentence(value);
    if (reason.length < 10 || hiddenRulePattern.test(reason)) return '';
    if (outcome?.declaredResult === 'opponent') {
      const contradictsOpponentOutcome = [
        /(?:玩家|你)(?:本回合)?(?:占优|有效)/,
        /本回合(?:判)?(?:你|玩家)/,
        /判(?:你|玩家)/,
        /(?:玩家|你)成功反制/,
        /对手(?:行动|本回合)?无效/
      ];
      return contradictsOpponentOutcome.some((pattern) => pattern.test(reason)) ? '' : reason;
    }
    const contradictsPlayerOutcome = [
      /对手(?:本回合)?(?:占优|有效)/,
      /本回合(?:判)?对手/,
      /判对手/,
      /对手成功反制/,
      /玩家(?:行动|本回合)?无效/
    ];
    return contradictsPlayerOutcome.some((pattern) => pattern.test(reason)) ? '' : reason;
  }

  function localReason(payload, outcome) {
    const move = String(payload?.move || '');
    if (outcome?.declaredResult === 'opponent') {
      return '你主动收住攻势并放弃争胜，对手顺势掌控擂台，本回合判对手占优。';
    }
    if (/(防守|格挡|护体|卸力|闪避|躲开|化解)/.test(move)) {
      return '你的防守衔接完整，并在化解攻势后保住主动，本回合判你占优。';
    }
    if (/(身法|瞬步|步法|速度|抢先|突进|追击|闪身)/.test(move)) {
      return '你的身法抢先占据有利位置，迫使对手调整节奏，本回合判你占优。';
    }
    if (/(封锁|压制|控制|困住|束缚|定住|阵法|封住)/.test(move)) {
      return '你的控制手段限制了对手的应对空间，并持续掌握局面，本回合判你占优。';
    }
    if (/(剑|刀|枪|拳|掌|法宝|符|术|火|雷|冰|霜|攻击|出招)/.test(move)) {
      return '你的招式完成度更高，攻势有效迫使对手退让，本回合判你占优。';
    }
    return '你的行动成功改变了场上局势，并取得更明确的主动，本回合判你占优。';
  }

  function reason(rawReason, payload, outcome) {
    return usable(rawReason, outcome) || localReason(payload, outcome);
  }

  root.GameTournamentVerdict = Object.freeze({ reason });
}(window));
