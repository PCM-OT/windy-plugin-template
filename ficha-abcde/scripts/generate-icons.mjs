// Gera os PNGs do PWA a partir de public/icon.svg. Uso: npm run icons
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const svg = await readFile(new URL('../public/icon.svg', import.meta.url));
const out = (n) => new URL(`../public/icons/${n}`, import.meta.url).pathname;

for (const size of [192, 512]) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(out(`icon-${size}.png`));
}
await sharp(svg, { density: 384 })
  .resize(180, 180)
  .png()
  .toFile(out('apple-touch-icon.png'));

// Maskable: conteúdo dentro da "zona segura" (80% central) sobre fundo cheio.
const inner = await sharp(svg, { density: 384 }).resize(360, 360).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0f172a' } })
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile(out('maskable-512.png'));
console.log('ícones gerados em public/icons');
