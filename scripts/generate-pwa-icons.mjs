// Script local, de uso unico: gera os PNGs de icone do PWA a partir do
// simbolo existente (public/brand/pascom-icon.svg) - nao roda em
// producao, so serve pra popular public/icons/ uma vez.
//
// Uso: node scripts/generate-pwa-icons.mjs

import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const svgPath = path.join(root, "public/brand/pascom-icon.svg");
const outDir = path.join(root, "public/icons");

const ORANGE_BG = "#fdb615"; // .cls-3 no svg de origem - fundo do simbolo
const svg = readFileSync(svgPath);

async function renderAny(size, filename) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outDir, filename));
  console.log("gerado:", filename);
}

// Icone maskable: o SO (principalmente Android) corta o icone em formas
// variadas (circulo, squircle, etc) - o conteudo precisa caber na "safe
// zone" central (~80%), por isso a margem extra em volta do simbolo.
async function renderMaskable(size, filename) {
  const inner = Math.round(size * 0.7);
  const iconBuffer = await sharp(svg, { density: 384 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: ORANGE_BG },
  })
    .composite([{ input: iconBuffer, gravity: "center" }])
    .png()
    .toFile(path.join(outDir, filename));
  console.log("gerado:", filename);
}

async function main() {
  await renderAny(192, "icon-192.png");
  await renderAny(512, "icon-512.png");
  await renderAny(180, "apple-touch-icon.png");
  await renderMaskable(192, "icon-maskable-192.png");
  await renderMaskable(512, "icon-maskable-512.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
