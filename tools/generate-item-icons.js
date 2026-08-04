'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const itemsPath = path.join(root, 'publish/assets/data/items.json');
const outputDirectory = path.join(root, 'publish/assets/items');
const manifestPath = path.join(root, '.studio/asset-manifest.json');
const endpoint = `${process.env.ANTHROPIC_BASE_URL}/v1/images/generations`;
const token = process.env.ANTHROPIC_AUTH_TOKEN;
const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : { version: 1, createdAt: new Date().toISOString(), assets: [] };

if (!token || !process.env.ANTHROPIC_BASE_URL) {
  throw new Error('Image Relay environment is unavailable');
}

fs.mkdirSync(outputDirectory, { recursive: true });
manifest.assets = Array.isArray(manifest.assets) ? manifest.assets : [];

const greenSubjects = new Set([
  'spirit_herb',
  'fragrant_jade',
  'cloud_spirit_tea',
  'marrow_jade_pill',
  'jade_hair_comb',
  'vine_marrow_seed'
]);

const rarityDirection = {
  普通: 'restrained silver and pale green accents',
  精良: 'jade, teal, and soft gold accents',
  珍稀: 'cool moonlight, rose, and refined gold accents',
  传说: 'radiant warm gold with a subtle spiritual aura',
  圣品: 'luminous ivory-gold with powerful sacred energy',
  神级: 'cosmic violet, star blue, and brilliant divine gold'
};

const roleDirection = {
  cultivation: 'a consumable cultivation treasure whose stored spiritual energy is visible',
  attribute: 'a permanent enhancement treasure with a strong, symbolic silhouette',
  gift: 'an elegant gift object with delicate craftsmanship',
  material: 'a rare crafting material with a raw but valuable silhouette'
};

function assetName(item) {
  return `item-${item.id.replaceAll('_', '-')}`;
}

function existingEntry(name) {
  return manifest.assets.find((entry) => (
    entry.name === name && entry.status === 'success'
      && entry.path && fs.existsSync(path.join(root, entry.path))
  ));
}

function promptFor(item, keyColor) {
  const keyName = keyColor === '#FF00FF' ? 'magenta' : 'green';
  return [
    'Purpose: reusable inventory item icon for a Chinese xianxia fantasy RPG.',
    'Canvas: 1024x1024, exactly one isolated object.',
    `Gameplay role: ${roleDirection[item.type] || 'a valuable fantasy inventory object'}; instantly recognizable at 56x56 pixels.`,
    `Subject: depict the item named “${item.name}” exactly as a physical object. Visual meaning: ${item.description}`,
    `Rarity treatment: ${rarityDirection[item.rarity] || 'restrained mystical accents'}.`,
    'Art direction: painterly Chinese fantasy game art, crisp readable silhouette, soft dark painted edge, refined ink-wash texture, restrained ornament, polished material rendering.',
    'View and framing: three-quarter front view, centered, object fills about 72% of the canvas, consistent scale, upper-left soft studio light.',
    'For scrolls, seals, talismans, notes, and manuals, use only abstract non-readable marks; never draw legible writing.',
    'No hand holding it, no person, no second object, no scenery, no ground, no cast shadow, no frame.',
    `Strictly placed on a SOLID UNIFORM ${keyColor} chroma key flat color background.`,
    `The background is a single uniform shade of ${keyColor} chroma key ${keyName} that fills 100% of pixels not occupied by the object.`,
    'No gradient, no shadow, no texture, no scenery, no ground, no decoration, no environmental elements.',
    `Pure flat color background, exactly like a ${keyName} screen used for VFX compositing.`,
    'No text, no logo, no watermark.'
  ].join('\n');
}

async function generate(item, index) {
  const name = assetName(item);
  const cached = existingEntry(name);
  if (cached) {
    item.icon = `./${cached.path.replace(/^publish\//, '')}`;
    console.log(`SKIP ${index + 1}/${items.length} ${name} ${cached.path}`);
    return;
  }
  const keyColor = greenSubjects.has(item.id) ? '#FF00FF' : '#00B140';
  console.log(`START ${index + 1}/${items.length} ${name}`);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt: promptFor(item, keyColor),
      size: '1024x1024',
      metadata: {
        gameId: '3273329',
        assetKind: 'item',
        assetName: name
      },
      processing: {
        wantsTransparent: true,
        chromaKeyColor: keyColor,
        compressionProfile: 'lossy_q85_alpha'
      },
      force: false
    })
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(`${name}: ${payload.error?.code || response.status} ${payload.error?.message || ''}`);
  }
  const imageResponse = await fetch(payload.data[0].url);
  if (!imageResponse.ok) throw new Error(`${name}: image download failed`);
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);
  const relativePath = `publish/assets/items/${name}.${hash}.webp`;
  fs.writeFileSync(path.join(root, relativePath), buffer);
  item.icon = `./${relativePath.replace(/^publish\//, '')}`;
  const relay = payload._relay || {};
  const entry = {
    name,
    status: 'success',
    path: relativePath,
    contentHash: hash,
    revisedPrompt: payload.data[0].revised_prompt,
    model: 'gpt-image-2',
    size: payload.size,
    wantsTransparent: true,
    chromaKey: relay.processing?.chromaKey,
    outputFormat: relay.processing?.outputFormat || 'webp',
    compressionProfile: relay.processing?.compressionProfile,
    originalBytes: relay.processing?.originalBytes,
    finalBytes: relay.processing?.finalBytes || buffer.length,
    usage: {
      inputTokens: payload.usage?.input_tokens,
      outputImageTokens: payload.usage?.output_tokens_details?.image_tokens
    },
    traceId: relay.traceId,
    createdAt: new Date().toISOString()
  };
  manifest.assets = manifest.assets.filter((asset) => asset.name !== name);
  manifest.assets.push(entry);
  manifest.updatedAt = new Date().toISOString();
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(itemsPath, `${JSON.stringify(items, null, 2)}\n`);
  console.log(
    `DONE ${index + 1}/${items.length} ${path.basename(relativePath)} ${buffer.length}`
      + ` chroma=${entry.chromaKey?.verdict || 'UNKNOWN'}`
  );
}

(async () => {
  for (let index = 0; index < items.length; index += 1) {
    await generate(items[index], index);
  }
  console.log(`COMPLETE ${items.length}/${items.length}`);
})().catch((error) => {
  console.error('FAILED', error.message);
  process.exitCode = 1;
});
