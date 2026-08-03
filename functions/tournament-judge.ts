function text(value: any, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

function number(value: any, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function profile(value: any) {
  return {
    name: text(value?.name, 40) || '无名修士',
    faction: text(value?.faction, 40),
    title: text(value?.title, 60),
    personality: text(value?.personality, 240),
    combatStyle: text(value?.combat_style || value?.combatStyle, 260),
    signatureMove: text(value?.signature_move || value?.signatureMove, 80),
    power: number(value?.power, 1, 120, 60),
  };
}

function hash(input: string) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function fallbackResult(body: any, opponents: any[]) {
  const move = text(body.move, 500);
  const turn = number(body.turn, 1, 3, 1);
  const seed = hash(`${body.actionId}:${move}:${turn}`);
  const creative = Math.min(12, Math.floor(move.length / 24));
  const playerDelta = 18 + creative + (seed % 8);
  const opponentDelta = 6 + ((seed >>> 4) % 12);
  const opponentNames = opponents.map((item) => item.name).join('与');
  const finished = turn >= 3;
  const playerTotal = number(body.scores?.player, 0, 999, 0) + playerDelta;
  const opponentTotal = number(body.scores?.opponent, 0, 999, 0) + opponentDelta;
  return {
    opponentAction: `${opponentNames}以招牌术法稳住阵脚，试图截断你的攻势。`,
    narration: `你将心中所想化作一式奇招，灵光越过擂台禁制，逼得${opponentNames}连退数步。对方虽及时反击，场上主动仍被你牢牢握住。`,
    commentary: finished ? '三招已尽，裁判依据压制、破招与临场变化作出最终裁定。' : '这一回合你占得上风，下一招仍可继续扩大优势。',
    playerDelta,
    opponentDelta,
    finished,
    winner: finished ? (playerTotal >= opponentTotal ? 'player' : 'opponent') : 'ongoing',
  };
}

function parseJson(raw: string) {
  const cleaned = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (_) { return null; }
  }
}

function normalizeResult(raw: any, body: any, opponents: any[]) {
  const base = fallbackResult(body, opponents);
  if (!raw || typeof raw !== 'object') return base;
  const turn = number(body.turn, 1, 3, 1);
  const playerDelta = number(raw.playerDelta, 0, 45, base.playerDelta);
  const opponentDelta = number(raw.opponentDelta, 0, 38, base.opponentDelta);
  const finished = turn >= 3;
  const playerTotal = number(body.scores?.player, 0, 999, 0) + playerDelta;
  const opponentTotal = number(body.scores?.opponent, 0, 999, 0) + opponentDelta;
  return {
    opponentAction: text(raw.opponentAction, 300) || base.opponentAction,
    narration: text(raw.narration, 900) || base.narration,
    commentary: text(raw.commentary, 360) || base.commentary,
    playerDelta,
    opponentDelta,
    finished,
    winner: finished ? (playerTotal >= opponentTotal ? 'player' : 'opponent') : 'ongoing',
  };
}

export default async function (request: any, ctx: any) {
  const body = request.body ?? {};
  const actionId = text(body.actionId, 100);
  const eventId = text(body.eventId, 100);
  const move = text(body.move, 500);
  const turn = number(body.turn, 1, 3, 1);
  if (!/^[a-zA-Z0-9_-]{12,100}$/.test(actionId)) throw new Error('actionId 格式无效');
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(eventId)) throw new Error('eventId 格式无效');
  if (move.length < 2) throw new Error('请描述至少两个字的招式');
  const opponents = Array.isArray(body.opponents) ? body.opponents.slice(0, 2).map(profile) : [];
  if (!opponents.length) throw new Error('缺少对手资料');

  const key = `tournament-action:${actionId}`;
  const reserved = await ctx.kv.putIfAbsent(key, {
    status: 'reserved',
    eventId,
    createdAt: new Date().toISOString(),
  });
  if (!reserved) {
    const existing = (await ctx.kv.get(key))?.value;
    if (existing?.status === 'completed' && existing.result) return existing.result;
    if (existing?.status === 'failed') throw new Error('该招式上次裁决失败，请重新出招');
    throw new Error('该招式仍在裁决中，请稍后重新出招');
  }

  const player = profile(body.player);
  const prompt = [
    '你是玄幻修仙擂台的首席裁判与热血解说。玩家可自由描述任何招式，你要让创意充分生效，主打爽快、华丽、以弱胜强。',
    '判定原则：有画面感、能结合环境、身法、心智或术法的招式应明显偏向玩家；明显自相矛盾时才让对手占优。',
    '每场固定三回合，前两回合不得结束；第三回合按累计得分决胜，同分判玩家胜。',
    `当前第${turn}回合。玩家：${JSON.stringify(player)}。对手：${JSON.stringify(opponents)}。`,
    `当前比分：玩家${number(body.scores?.player, 0, 999, 0)}，对手${number(body.scores?.opponent, 0, 999, 0)}。`,
    `玩家招式：${move}`,
    `近期战况：${text(body.recentLogs, 1200)}`,
    '只返回一个 JSON 对象，不要代码块。字段：opponentAction、narration、commentary、playerDelta、opponentDelta。',
    'playerDelta 0-45，opponentDelta 0-38。叙事必须写清双方应对、碰撞结果与擂台反馈，避免色情描写。'
  ].join('\n');

  try {
    const response = await ctx.completions({
      model: 'default',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 850,
    });
    const result = normalizeResult(parseJson(text(response?.text, 5000)), body, opponents);
    await ctx.kv.put(key, {
      status: 'completed',
      eventId,
      completedAt: new Date().toISOString(),
      result,
    });
    return result;
  } catch (error: any) {
    await ctx.kv.put(key, {
      status: 'failed',
      eventId,
      failedAt: new Date().toISOString(),
      message: text(error?.message, 240),
    });
    throw error;
  }
}
