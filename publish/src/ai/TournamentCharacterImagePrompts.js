(function installTournamentCharacterImagePrompts(root) {
  'use strict';

  const profiles = Object.freeze({
    shen_yuzhi: {
      prompt: 'Adult Chinese woman, dark brown hair in a loose high bun, soft red-brown eyes, warm knowing smile, white and pale-blue layered hanfu with very wide mountain-pattern sleeves, dark teal sash, waist medicine pouch, bare feet. Preserve this exact gentle mature silhouette.',
      notes: '乌黑松散高髻、红棕眼、白蓝宽袖山水纹长袍、深青腰带、药囊、赤足。'
    },
    lu_qianxue: {
      prompt: 'Adult Chinese woman sword attendant, silver-white hair in a neat low bun, cool pale-blue eyes, restrained expression, white and icy-blue narrow-sleeve sword robe, twin short swords with blue tassels, pale boots. Preserve the clean agile cold-sword silhouette.',
      notes: '银白低髻、冷蓝眼、白青窄袖剑装、双短剑、蓝色剑穗、白色长靴。'
    },
    tang_miaoyin: {
      prompt: 'Adult petite Chinese woman musician, voluminous chestnut-brown curly hair, golden eyes, blushing playful smile, cream and wine-red wide-sleeve dress with green-gold trim, flute and hanging jade bells. Preserve her warm rounded cheerful silhouette.',
      notes: '棕色蓬松卷发、金眸、羞红笑容、米白酒红宽袖裙、短笛、玉铃。'
    },
    pei_zhaoying: {
      prompt: 'Tall adult dark-skinned Chinese fantasy woman shadow operative, long black braided hair, pale violet eyes, calm stern face, fitted black and crimson light armor, dark plated shoulders and bracers, utility belt, black high boots. Preserve the powerful athletic silhouette.',
      notes: '深色肤色、黑色长辫、紫灰眼、黑红轻甲、护肩护臂、工具腰带、黑色高靴。'
    },
    gu_qingluo: {
      prompt: 'Tall adult Chinese woman frost swordswoman, long black hair with an icy silver crown, pale blue eyes, stern elegant expression, white and glacier-blue robe with crystalline fur-like shoulder ornaments, ornate ice greatsword. Preserve the tall cold luminous silhouette.',
      notes: '黑色长发、冰晶银冠、白冰蓝长袍、冰晶肩饰、巨大冰霜长剑。'
    },
    jiang_yechun: {
      prompt: 'Mature adult Chinese woman heavy swordmaster, long dark crimson hair with one white streak, sharp tired eyes, black rugged layered robes, bronze shoulder armor, leather belts and pouches, enormous broad greatsword on her back. Preserve the sturdy battle-worn silhouette.',
      notes: '暗红长发夹白发、黑色旧战袍、铜色护肩、皮带腰包、背负巨型重剑。'
    },
    ning_feixing: {
      prompt: 'Adult petite Chinese woman swift sword使, short tousled copper-orange curls, vivid green eyes, bright mischievous smile, navy and white short battle dress with silver star trim, pale blue sword, lively airborne pose. Preserve the energetic agile silhouette.',
      notes: '橙棕短卷发、绿眸、活泼笑容、深蓝银纹短装、浅蓝长剑、灵动姿势。'
    },
    wen_yaosu: {
      prompt: 'Mature adult Chinese woman healer, dark teal hair in a side braid with a small medicine jar hair ornament, warm amber eyes, gentle smile, pale green outer robe over a blue-white dress, herb pouch, hanging turquoise medicine bottles, glowing green pill. Preserve the calm reliable healer silhouette.',
      notes: '墨绿色侧辫、药瓶发饰、琥珀眼、青白蓝医修长裙、药囊、绿色药瓶。'
    },
    luo_feihong: {
      prompt: 'Adult petite Chinese woman poison master, short plum-purple bob, sharp golden eyes, sly smile, black and deep-purple robe with crimson hem, silver clawed gauntlets, belt of colorful poison vials, dark stockings and pointed boots. Preserve the dangerous agile silhouette.',
      notes: '紫色短发、金色锐眼、黑紫毒师袍、红色纹边、银色爪甲、毒瓶腰带。'
    },
    ji_mingzhu: {
      prompt: 'Voluptuous adult Chinese woman alchemy heiress, long voluminous golden hair, violet eyes, confident refined smile, luxurious gold and crimson alchemist gown, ornate red cape, several floating golden-red flame orbs and fire gourds. Preserve the rich noble silhouette.',
      notes: '金色丰厚长发、紫眸、金红华服、红色披肩、金红丹火灵珠、贵气体态。'
    },
    yue_tinglan: {
      prompt: 'Slender adult Chinese woman blindfolded musician, very long white hair, teal blindfold, serene expression, pale aqua and white flowing robes with translucent sleeves, holding a large dark jade-trimmed ruan lute. Preserve the quiet ethereal silhouette.',
      notes: '雪白长发、青色眼纱、白青半透明长袍、乌木玉边阮琴、安静气质。'
    },
    shangguan_zhiyin: {
      prompt: 'Tall adult Chinese woman dance priestess, long crimson hair with an elaborate gold headdress, confident closed-eye smile, ornate wine-red and gold dance hanfu, long red silk ribbons, gold chains and ankle bells, elegant raised-arm pose. Preserve the lavish flowing silhouette.',
      notes: '酒红长发、华丽金冠、酒红金色舞衣、长红飘带、金链、脚铃。'
    },
    su_qingque: {
      prompt: 'Adult athletic Chinese woman thunder drummer, teal-black hair in two buns, bright blue eyes, warm brown skin, yellow scarf and coat over dark padded combat clothes, huge strapped thunder drum pack, lightning staff. Preserve the sturdy adventurous silhouette.',
      notes: '青黑双丸子头、古铜肤、黄色围巾短斗篷、深色战装、雷鼓背包、雷电长杖。'
    },
    jiang_zhaoyue: {
      prompt: 'Tall adult Chinese woman righteous sword leader, black hair in a formal bun, golden-brown eyes, composed stern expression, ivory and black ceremonial robe with broad engraved shoulder panels, turquoise ornaments, long straight sword. Preserve the dignified authoritative silhouette.',
      notes: '黑发高髻、金棕眼、象牙黑金法袍、宽大雕纹肩饰、青色挂饰、长剑。'
    },
    gu_yunzheng: {
      prompt: 'Adult Chinese woman guardian swordswoman, black hair in a neat bun, clear teal eyes, gentle determined expression, white and pale-cyan robe with translucent teal cape sleeves, glowing cyan pendant, slim pale-blue sword. Preserve the calm protective silhouette.',
      notes: '黑色发髻、青眸、白青长袍、半透明青色披袖、发光青色吊坠、浅蓝剑。'
    },
    shen_jingchen: {
      prompt: 'Mature adult Chinese woman formation healer, brown hair in a high formal bun, warm red-brown eyes, gentle smile, pale blue and white wide-sleeve mountain-pattern robe, ornate belt, medicine pouch, barefoot. Preserve the soft dignified protective silhouette.',
      notes: '栗色高髻、红棕眼、白蓝宽袖山水纹袍、腰带、药囊、赤足。'
    }
  });

  const target = root.GameCharacterImagePrompts;
  if (!target) return;
  const oldPrompt = target.getPrompt?.bind(target);
  const oldNotes = target.getNotes?.bind(target);
  const oldProfile = target.getProfile?.bind(target);
  const oldReference = target.getReferenceAsset?.bind(target);
  target.getPrompt = (id) => profiles[id]?.prompt || oldPrompt?.(id) || '';
  target.getNotes = (id) => profiles[id]?.notes || oldNotes?.(id) || '';
  target.getProfile = (id) => profiles[id] || oldProfile?.(id) || null;
  target.getReferenceAsset = (id) => profiles[id]?.referenceAsset
    || oldReference?.(id) || '';
  target.profiles = Object.freeze({ ...(target.profiles || {}), ...profiles });
}(window));
