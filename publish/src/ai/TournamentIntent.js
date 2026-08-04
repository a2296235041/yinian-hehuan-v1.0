(function installTournamentIntent(root) {
  'use strict';

  const adultPattern = /(成人|性爱|性行为|交合|亲吻|接吻|舔|咬|摸|揉|抚|脱衣|裸体|内裤|裙底|胸|乳|奶|臀|下体|蜜穴|骚穴|阴部|阴道|性器|肉棒|阳具|抽插|插入|射入|精液|高潮|口交|乳交|后入|骑乘|调教|淫|骚|性奴)/;
  const actionPattern = /(进行|实施|完成|抵住|贴住|按住|压住|抱住|搂住|含住|吸吮|舔舐|揉捏|脱下|扯开|插入|进入|抽插|摩擦|顶入|射入|捆住|制住)/;
  const controlPattern = /(破防|压制|制住|无法反抗|不能反抗|失去力气|拿不住|脱手|动弹不得|任由|彻底控制)/;
  const tentativePattern = /(想要|想试|试图|尝试|准备|打算|欲要|企图|如果|是否)/;

  function analyze(move) {
    const value = String(move || '').trim();
    const adult = adultPattern.test(value);
    const asserted = !tentativePattern.test(value);
    const decisive = controlPattern.test(value)
      || (adult && asserted && actionPattern.test(value));
    return Object.freeze({ adult, asserted, decisive });
  }

  function enforceExchange(exchange, intent) {
    let playerDelta = Math.max(0, Math.round(Number(exchange?.playerDelta) || 0));
    let opponentDelta = Math.max(0, Math.round(Number(exchange?.opponentDelta) || 0));
    if (!intent?.decisive || playerDelta > opponentDelta) {
      return { ...exchange, playerDelta, opponentDelta };
    }
    playerDelta = Math.min(45, Math.max(playerDelta, opponentDelta + 8));
    opponentDelta = Math.min(opponentDelta, Math.max(0, playerDelta - 12));
    return { ...exchange, playerDelta, opponentDelta };
  }

  root.GameTournamentIntent = Object.freeze({ analyze, enforceExchange });
}(window));
