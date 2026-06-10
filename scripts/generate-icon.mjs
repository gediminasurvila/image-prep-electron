/**
 * Rasterizes build/icon.svg to build/icon.png (1024x1024).
 * electron-builder derives the platform .ico/.icns from this PNG at build time.
 *
 * Run with: node scripts/generate-icon.mjs
 */
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const svg = readFileSync(path.join(root, 'build', 'icon.svg'))

await sharp(svg, { density: 384 })
  .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(root, 'build', 'icon.png'))

console.log('Wrote build/icon.png (1024x1024)')
