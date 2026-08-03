(function installCharacterImagePrompts(root) {
  'use strict';

  const profiles = Object.freeze({
    su_meier: {
      prompt: [
        'Character identity lock for Su Meier: an adult Chinese woman with a lush hourglass figure,',
        'warm ivory skin, long ink-black hair arranged in a loose side-swept cloud updo,',
        'two soft curled sidelocks, warm rose-brown eyes, and a gentle knowing smile.',
        'Her signature outfit is a flowing pearl-white and pale-aqua silk hanfu with translucent',
        'water sleeves, turquoise embroidered edging, a dark teal waist sash, pearl drop earrings,',
        'and one white-jade magnolia hairpin. Keep this exact face, hairstyle, palette, and jewelry.'
      ].join(' '),
      notes: '接引师姐。视觉关键词：温柔丰腴、黑发云髻、水绿色长袖、白玉木兰簪。禁止改成金发、短发、冷峻表情或深色战斗服。',
      portraitPrompt: [
        'FINAL PORTRAIT CONSISTENCY OVERRIDE: match the established Su Meier standee exactly:',
        'very curvy adult figure, fair skin, black wavy hair in a loose updo, gold lattice side',
        'hair ornaments, closed smiling eyes, a pearl-white low-cut inner gown edged in turquoise,',
        'a translucent pale-aqua outer robe with very long water sleeves, teal waist sash, and gold',
        'anklet. Do not add weapons or dark armor. This clause overrides conflicting accessory details.'
      ].join(' '),
      portraitNotes: '以现有立绘为最终准则：金色镂空侧发饰、白色低胸内裙、水绿透明长袖外袍、青色腰带、金色脚链。',
      referenceAsset: './assets/generated/npc-standee-su-meier.a9f08237.webp'
    },
    liu_hanyan: {
      prompt: [
        'Character identity lock for Liu Hanyan: a tall adult Chinese woman with a regal balanced',
        'figure, cool pale skin, long midnight-indigo hair in a high formal sect-master coiffure,',
        'narrow violet eyes, straight brows, and a calm imperious expression.',
        'Her signature outfit is a black and deep-indigo ceremonial robe with rigid wing-shaped',
        'shoulder pieces, fine antique-gold phoenix filigree, long mantle sleeves, black gloves,',
        'and a dark-gold crown comb. Keep this exact royal silhouette, palette, face, and hairstyle.'
      ].join(' '),
      notes: '冷艳宗主。视觉关键词：高挑女王、靛蓝高髻、紫眸、黑蓝金凤纹礼服、翼形肩甲。不可使用其他角色的浅色纱衣或暖色发色。',
      portraitPrompt: [
        'FINAL PORTRAIT CONSISTENCY OVERRIDE: match the established Liu Hanyan standee exactly:',
        'tall voluptuous adult figure, long blue-violet hair partly pinned with a dark blue flower,',
        'a small angular gold crown, cool violet eyes, a black plunging halter gown with deep-indigo',
        'front panel and ornate gold filigree, exposed side waist, sheer black leg panels, long navy',
        'cloak sleeves, black gloves, and gold-edged wing-shaped shoulders. Preserve this silhouette.'
      ].join(' '),
      portraitNotes: '以现有立绘为最终准则：蓝紫长发、深蓝花饰与小金冠、黑蓝金深领礼服、披风长袖、黑手套、金边翼肩。',
      referenceAsset: './assets/generated/npc-standee-liu-hanyan.340893ff.webp'
    },
    han_yueshuang: {
      prompt: [
        'Character identity lock for Han Yueshuang: an athletic tall adult Chinese woman with',
        'defined limbs, light olive skin, dark brown hair in a severe high warrior bun,',
        'one loose strand across her cheek, sharp crimson-brown eyes, and a disciplined stern face.',
        'Her signature outfit is fitted black and dark-red enforcement battle hanfu with leather',
        'waist armor, an asymmetric bronze shoulder guard, red knotted cords, tall black boots,',
        'a coiled red discipline whip, and a sheathed straight sword. Preserve every signature item.'
      ].join(' '),
      notes: '执法长老。视觉关键词：健美修长、严厉、黑红执法战装、红绳结、戒鞭与直剑。不可画成柔弱文职、华丽宗主或轻纱造型。',
      portraitPrompt: [
        'FINAL PORTRAIT CONSISTENCY OVERRIDE: match the established Han Yueshuang standee exactly:',
        'tall voluptuous adult hourglass figure, black-brown hair in an ornate updo with a small gold',
        'crown, red eyes, stern expression, a revealing black and dark-crimson rope-laced enforcement',
        'dress, sheer black stockings, fitted black forearm gloves, black-and-gold heels, one slim',
        'brown discipline rod, and one coiled red whip. No visible sword and no shoulder armor.'
      ].join(' '),
      portraitNotes: '以现有立绘为最终准则：丰盈高挑、黑棕盘发与小金冠、红眸、黑红绳结执法裙、黑丝袜、戒尺与红鞭；不出现剑和肩甲。',
      referenceAsset: './assets/generated/npc-standee-han-yueshuang.352ae25d.webp'
    },
    yun_shuiyao: {
      prompt: [
        'Character identity lock for Yun Shuiyao: a petite adult Chinese woman with a delicate',
        'scholarly build, fair skin, shoulder-length honey-blonde curls, clear lake-blue eyes,',
        'and a sleepy, quietly curious expression.',
        'Her signature outfit is an ivory and mist-lavender scholar hanfu with translucent layered',
        'sleeves, fine blue hems, a moonstone clasp, a narrow blue waist ribbon, and soft cloth shoes.',
        'She carries an unfurled jade-ended scripture scroll. Keep the curls, scroll, and pale palette.'
      ].join(' '),
      notes: '书阁阁主。视觉关键词：成年娇小、蜜金短卷发、蓝眸、象牙白与雾紫书卷服、玉轴经卷。不可改成长直黑发、战甲或炼丹配件。',
      portraitPrompt: [
        'FINAL PORTRAIT CONSISTENCY OVERRIDE: match the established Yun Shuiyao standee exactly:',
        'petite curvy adult figure, short golden-blonde curled bob, blue eyes, an ivory-white sheer',
        'off-shoulder floor-length scholar gown, transparent wrapped sleeves, pale-blue embroidered',
        'hem, a blue gemstone waist clasp with thin blue ribbons, bare feet, and a wide unfurled',
        'calligraphy scroll with dark-green jade rollers. Do not add shoes, armor, or weapons.'
      ].join(' '),
      portraitNotes: '以现有立绘为最终准则：金色短卷发、蓝眸、白色透明露肩长裙、浅蓝绣边与腰间蓝宝石、赤足、绿色玉轴书卷。',
      referenceAsset: './assets/generated/npc-standee-yun-shuiyao.38bab51c.webp'
    },
    qin_wanqing: {
      prompt: [
        'Character identity lock for Qin Wanqing: a voluptuous adult Chinese woman with a powerful',
        'curvy figure, sun-warmed skin, very long crimson-rose curls, bright emerald eyes,',
        'and a fearless fiery grin.',
        'Her signature outfit is a charcoal, burnished-copper, and smoky-silver alchemist ensemble:',
        'a short fitted mantle, wrapped silk bodice, high-waisted split overskirt, dark stockings,',
        'copper arm guards, jade medicine vials, and a flame-shaped hair ornament. Keep all details.'
      ].join(' '),
      notes: '首席炼丹师。视觉关键词：火辣丰盈、玫红长卷发、绿眸、炭黑铜色炼丹装、药瓶与火焰发饰。不可与墨巧儿的护目镜工匠装混用。',
      portraitPrompt: [
        'FINAL PORTRAIT CONSISTENCY OVERRIDE: match the established Qin Wanqing standee exactly:',
        'very voluptuous adult figure, long vivid rose-pink curls covering part of one eye, emerald',
        'eyes, confident smile, a black-brown cropped shoulder cape with gold trim, a silver-blue',
        'wrapped halter bodice and matching short hip wrap, dark thigh-high stockings, gold chain',
        'garters, and silver high heels. Do not add goggles, a tool belt, or a visible weapon.'
      ].join(' '),
      portraitNotes: '以现有立绘为最终准则：玫红长卷发遮住一侧眼睛、绿眸、黑棕短披肩、银蓝裹胸与短裙、深色长袜、金链腿饰、银色高跟鞋。',
      referenceAsset: './assets/generated/npc-standee-qin-wanqing.f515aa6e.webp'
    },
    mo_qiaoer: {
      prompt: [
        'Character identity lock for Mo Qiaoer: a clearly adult petite Chinese woman with a compact',
        'agile build, warm tan skin, a tousled short golden-blonde bob with copper-orange tips,',
        'large amber eyes, and a mischievous open smile.',
        'Her signature outfit is a teal and bronze artifact-smith work set with goggles on her head,',
        'a fitted sleeveless top, fur-trimmed utility shorts, fingerless gauntlets, mismatched armored',
        'boots, a tool belt, and tiny glowing circuit-runes. Keep her unmistakably adult and technical.'
      ].join(' '),
      notes: '首席炼器师。视觉关键词：明确成年、娇小灵动、金橙短发、琥珀眼、护目镜、青铜工匠短装、工具腰带。禁止幼态化，也不可添加狐耳狐尾。',
      portraitPrompt: [
        'FINAL PORTRAIT CONSISTENCY OVERRIDE: match the established Mo Qiaoer standee exactly:',
        'clearly adult petite curvy figure, warm tan skin, tousled golden-blonde short bob with coral',
        'tips, amber-red eyes, bronze goggles on her head, a green patterned halter crop top, matching',
        'fur-trimmed utility shorts, dark fingerless gauntlets, brown thigh straps, mismatched green',
        'armored boots, and a turquoise pendant. Keep the energetic raised-hand pose and adult features.'
      ].join(' '),
      portraitNotes: '以现有立绘为最终准则：成年娇小、暖棕肤色、金色短发带珊瑚色发梢、红琥珀眼、铜护目镜、绿色工匠短装、毛边短裤与不对称护靴。',
      referenceAsset: './assets/generated/npc-standee-mo-qiaoer.64f6011d.webp'
    },
    bai_zhi: {
      prompt: [
        'Character identity lock for Bai Zhi: a slender adult Chinese woman with fragile elegance,',
        'porcelain-pale skin, very long ink-black hair worn loose with two thin temple braids,',
        'pale ice-blue eyes, and a distant melancholy expression.',
        'Her signature outfit is an ethereal white and glacier-blue hermit hanfu with long translucent',
        'outer sleeves, a pale blue crossed sash, silver lotus pins, a white medicinal sachet,',
        'and bare feet with a fine silver ankle chain. Keep the restrained icy palette and silhouette.'
      ].join(' '),
      notes: '后山隐士。视觉关键词：纤细苍白、黑色披发、冰蓝眸、白与冰蓝隐士纱衣、银莲簪、药囊、赤足。不可画成金发正道剑修或妖族。',
      portraitPrompt: [
        'FINAL PORTRAIT CONSISTENCY OVERRIDE: match the established Bai Zhi standee exactly:',
        'slender yet very busty adult figure, porcelain skin, long loose black hair with softly waved',
        'sides, downcast blushing face, an almost transparent white gauze gown gathered across the',
        'chest, pale-blue draped outer sleeves, a tiny blue waist ornament with narrow ribbons, and',
        'bare feet. No crown, no weapon, no visible medicine pouch, and no elaborate hair ornaments.'
      ].join(' '),
      portraitNotes: '以现有立绘为最终准则：苍白纤细但胸部丰满、黑色披发、低眉羞红、近透明白纱裙、浅蓝披袖、小型蓝色腰饰、赤足。',
      referenceAsset: './assets/generated/npc-standee-bai-zhi.79c8c1df.webp'
    },
    hu_jiuer: {
      prompt: [
        'Character identity lock for Hu Jiuer: a voluptuous adult nine-tailed fox spirit woman with',
        'warm fair skin, waist-length lavender hair, large lavender fox ears with white inner fur,',
        'golden slit-pupil eyes, a small violet forehead jewel, and a sly playful smile.',
        'Her signature outfit is a violet, ivory, and gold fox-princess dance hanfu with draped silk',
        'panels, gold body chains, bell anklets, and long detached sleeves. Exactly nine large fluffy',
        'lavender tails fan behind her; never omit, merge, or recolor the ears and tails.'
      ].join(' '),
      notes: '妖族公主。视觉关键词：成年九尾狐、薰衣草长发与狐耳、金色竖瞳、九条紫白蓬松狐尾、紫白金舞衣。必须明确九尾，不可只画一尾。',
      portraitPrompt: [
        'FINAL PORTRAIT CONSISTENCY OVERRIDE: match the established Hu Jiuer standee exactly:',
        'voluptuous adult fox-spirit figure, waist-length lavender hair, enormous upright lavender',
        'fox ears, a violet forehead jewel with gold chain, playful closed-eye smile, a minimal',
        'purple halter-and-loincloth dance outfit, gold body chains, long purple detached sleeves,',
        'gold sandals, and exactly nine enormous fluffy lavender tails forming a full fan behind her.'
      ].join(' '),
      portraitNotes: '以现有立绘为最终准则：紫色长发与巨大狐耳、额心紫宝石金链、闭眼狡黠笑、紫色舞衣与金色链饰、金凉鞋、九条巨大薰衣草色狐尾。',
      referenceAsset: './assets/generated/npc-standee-hu-jiuer.a10661ad.webp'
    },
    xiao_qingxuan: {
      prompt: [
        'Character identity lock for Xiao Qingxuan: a tall adult Chinese woman with an elegant',
        'immortal-swordswoman figure, fair skin, extremely long pale-golden wavy hair,',
        'clear teal eyes, and a composed righteous expression hiding subtle inner conflict.',
        'Her signature outfit is a white and pale-cyan orthodox sect sword robe with silver cloud',
        'embroidery, a concealed crimson inner lining, a teal jade pendant, silver bracers,',
        'and a narrow white-jade sword. Keep the golden hair, teal eyes, sword, and hidden red accent.'
      ].join(' '),
      notes: '正道卧底。视觉关键词：高挑仙子、浅金长卷发、青绿眸、白青正道剑服、暗藏红色里衬、白玉细剑。不可画成书阁卷轴造型或黑红执法装。',
      portraitPrompt: [
        'FINAL PORTRAIT CONSISTENCY OVERRIDE: match the established Xiao Qingxuan standee exactly:',
        'tall voluptuous adult immortal figure, extremely long pale-golden wavy hair, turquoise eyes,',
        'a conflicted blushing expression, a sheer white floor-length gown with pale-cyan trim,',
        'deep neckline, very high side slit, visible crimson inner garment, teal gemstone pendant,',
        'delicate silver wrist ornament, and bare feet. No visible sword, armor, scroll, or fox traits.'
      ].join(' '),
      portraitNotes: '以现有立绘为最终准则：浅金超长卷发、青绿眸、羞红矛盾神情、白色透明长裙与浅青边、高开衩露出红色内衬、青色吊坠、赤足。',
      referenceAsset: './assets/generated/npc-standee-xiao-qingxuan.7a93f059.webp'
    }
  });
  function getProfile(npcId) {
    return profiles[String(npcId || '')] || null;
  }
  root.GameCharacterImagePrompts = {
    getPrompt(npcId) {
      const profile = getProfile(npcId);
      return profile ? [profile.prompt, profile.portraitPrompt].filter(Boolean).join(' ') : '';
    },
    getNotes: (npcId) => getProfile(npcId)?.notes || '',
    getPortraitNotes: (npcId) => getProfile(npcId)?.portraitNotes || '',
    getReferenceAsset: (npcId) => getProfile(npcId)?.referenceAsset || '',
    getProfile,
    profiles
  };
}(window));
