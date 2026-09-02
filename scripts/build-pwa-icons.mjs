/**
 * 从 public/pwa-icon.svg 的几何图形光栅化生成 PWA PNG 图标。
 *
 * 纯 Node 实现（zlib + 手写 PNG chunk），不依赖 sharp/canvas/ImageMagick，
 * 避免为单个构建资产引入原生依赖。输出：
 *   - public/pwa-icon-192.png
 *   - public/pwa-icon-512.png
 *
 * 用法：node scripts/build-pwa-icons.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PUBLIC_DIR = path.resolve(__dirname, '../public')

// pwa-icon.svg 的设计（viewBox 0 0 512 512）：
//   - 圆角矩形（rx=100）填充 #4ade80
//   - 白色三角形：A(256,128) B(176,268) C(336,268)
//   - 白色圆：圆心 (256,320) r=40
const GREEN = [0x4a, 0xde, 0x80]
const WHITE = [0xff, 0xff, 0xff]
const ROUNDED_RADIUS = 100
const SIZE = 512

const inRoundedRect = (x, y) => {
  if (x < 0 || x > SIZE || y < 0 || y > SIZE) return false
  const inCornerX = x < ROUNDED_RADIUS || x > SIZE - ROUNDED_RADIUS
  const inCornerY = y < ROUNDED_RADIUS || y > SIZE - ROUNDED_RADIUS
  if (inCornerX && inCornerY) {
    const cx = x < SIZE / 2 ? ROUNDED_RADIUS : SIZE - ROUNDED_RADIUS
    const cy = y < SIZE / 2 ? ROUNDED_RADIUS : SIZE - ROUNDED_RADIUS
    const dx = x - cx
    const dy = y - cy
    return dx * dx + dy * dy <= ROUNDED_RADIUS * ROUNDED_RADIUS
  }
  return true
}

const inTriangle = (x, y) => {
  const ax = 256
  const ay = 128
  const bx = 176
  const by = 268
  const cx = 336
  const cy = 268
  const sign = (p1x, p1y, p2x, p2y, p3x, p3y) =>
    (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y)
  const d1 = sign(x, y, ax, ay, bx, by)
  const d2 = sign(x, y, bx, by, cx, cy)
  const d3 = sign(x, y, cx, cy, ax, ay)
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

const inCircle = (x, y) => {
  const dx = x - 256
  const dy = y - 320
  return dx * dx + dy * dy <= 40 * 40
}

// 返回采样点的颜色 [r,g,b] 或 null（透明）
const sampleColor = (x, y) => {
  if (inTriangle(x, y) || inCircle(x, y)) return WHITE
  if (inRoundedRect(x, y)) return GREEN
  return null
}

// 2x2 超采样：同一像素内多数不透明颜色取色，覆盖率决定 alpha，得到抗锯齿边缘
const pixelColor = (px, py, step) => {
  const offsets = [0.25, 0.75]
  const opaque = []
  let hits = 0

  for (const ox of offsets) {
    for (const oy of offsets) {
      const color = sampleColor((px + ox) * step, (py + oy) * step)
      if (color) {
        hits += 1
        opaque.push(color)
      }
    }
  }

  if (hits === 0) return [0, 0, 0, 0]

  const greenHits = opaque.filter((c) => c === GREEN).length
  const majority = greenHits >= opaque.length / 2 ? GREEN : WHITE
  return [majority[0], majority[1], majority[2], Math.round((hits / 4) * 255)]
}

// ---- PNG 编码（8-bit RGBA） ----

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

const crc32 = (data) => {
  let crc = 0xffffffff
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const chunk = (type, data) => {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([length, typeAndData, crc])
}

const encodePng = (width, height, rgba) => {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  // 每行前置 filter byte 0（None）
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const renderIcon = (size) => {
  const step = SIZE / size
  const rgba = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixelColor(x, y, step)
      const offset = (y * size + x) * 4
      rgba[offset] = r
      rgba[offset + 1] = g
      rgba[offset + 2] = b
      rgba[offset + 3] = a
    }
  }
  return encodePng(size, size, rgba)
}

for (const size of [192, 512]) {
  const filePath = path.join(PUBLIC_DIR, `pwa-icon-${size}.png`)
  fs.writeFileSync(filePath, renderIcon(size))
  console.log(`generated ${path.relative(process.cwd(), filePath)} (${size}x${size})`)
}
