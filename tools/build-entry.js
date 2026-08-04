'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(__dirname, 'entry-sources.v056.json');
const outputPath = path.join(root, 'publish/main.v056.js');
const sources = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  .map((file) => path.join(root, 'publish', file));

sources.forEach((file) => {
  if (!fs.existsSync(file)) throw new Error(`入口源文件不存在: ${file}`);
});

const result = spawnSync('npx', [
  '--yes',
  'terser@5',
  ...sources,
  '--ecma',
  '2020',
  '--compress',
  '--output',
  outputPath
], {
  cwd: root,
  encoding: 'utf8',
  stdio: 'inherit'
});

if (result.status !== 0) {
  throw new Error(`入口构建失败，退出码 ${result.status}`);
}

const bundle = fs.readFileSync(outputPath, 'utf8').trim();
const sourceHash = crypto.createHash('sha256');
sources.forEach((file) => {
  sourceHash.update(path.relative(root, file));
  sourceHash.update('\0');
  sourceHash.update(fs.readFileSync(file));
  sourceHash.update('\0');
});
const digest = sourceHash.digest('hex').slice(0, 16);
fs.writeFileSync(outputPath, `/* release 0.5.6 sources:${digest} */\n${bundle}\n`);
console.log(`Built ${path.relative(root, outputPath)} from ${sources.length} files`);
