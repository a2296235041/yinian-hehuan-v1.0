(function installPlayerIdentity(root) {
  'use strict';

  function get(origin = root.Game?.player?.origin) {
    const female = origin?.gender === 'female';
    return {
      gender: female ? 'female' : 'male',
      female,
      role: female ? '刚进入合欢宗的成年女性弟子' : '刚进入合欢宗的成年男性弟子',
      pronoun: female ? '她' : '他',
      possessive: female ? '她的' : '他的',
      intimacyRule: female
        ? '玩家与所有可攻略角色均为成年女性。所有亲密与双修内容必须保持女性之间的关系，只描写女性身体与女性之间的互动，不得给玩家添加男性身体特征、男性生殖器、精液、阳刚气息或男性称谓。'
        : '玩家是成年男性。亲密与双修内容保持异性关系，不得把玩家改写成女性。'
    };
  }

  function choose(value, fallback = '') {
    if (typeof value === 'string') return value;
    const selected = value?.[get().gender];
    return typeof selected === 'string' && selected.trim() ? selected : fallback;
  }

  root.GamePlayerIdentity = Object.freeze({
    get,
    isFemale: (origin) => get(origin).female,
    choose
  });
}(window));
