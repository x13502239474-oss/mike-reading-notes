/** 零依赖生成 PWA PNG 图标（手写 PNG 编码 + 像素绘制）。 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/icons')
mkdirSync(outDir, { recursive: true })

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}

function encodePNG(size, pixels) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0 // filter: none
    pixels.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const PAPER = [247, 244, 237]
const CLAY = [150, 88, 60]
const WHITE = [253, 251, 247]

function drawIcon(size, maskable = false) {
  const buf = Buffer.alloc(size * size * 4)
  const put = (x, y, color) => {
    const px = Math.round(x)
    const py = Math.round(y)
    if (px < 0 || py < 0 || px >= size || py >= size) return
    const i = (py * size + px) * 4
    buf[i] = color[0]
    buf[i + 1] = color[1]
    buf[i + 2] = color[2]
    buf[i + 3] = 255
  }
  const rect = (x0, y0, x1, y1, color) => {
    for (let y = Math.round(y0); y < Math.round(y1); y++) {
      for (let x = Math.round(x0); x < Math.round(x1); x++) put(x, y, color)
    }
  }
  const roundedRect = (x0, y0, x1, y1, r, color) => {
    for (let y = Math.round(y0); y < Math.round(y1); y++) {
      for (let x = Math.round(x0); x < Math.round(x1); x++) {
        const dx = Math.min(x - x0, x1 - x)
        const dy = Math.min(y - y0, y1 - y)
        if (dx < r && dy < r) {
          if ((dx - r) ** 2 + (dy - r) ** 2 > r * r) continue
        }
        put(x, y, color)
      }
    }
  }

  const s = size
  const bg = maskable ? CLAY : PAPER
  const seal = maskable ? WHITE : CLAY
  const page = maskable ? CLAY : WHITE
  const line = maskable ? WHITE : CLAY

  rect(0, 0, s, s, bg)
  const m = maskable ? 0.12 * s : 0.14 * s
  roundedRect(m, m, s - m, s - m, 0.09 * s, seal)

  // 一本摊开的书
  const bx0 = m + 0.11 * s
  const bx1 = s - m - 0.11 * s
  const by0 = m + 0.15 * s
  const by1 = s - m - 0.15 * s
  rect(bx0, by0, bx1, by1, page)
  // 书脊
  rect(s * 0.495, by0, s * 0.505, by1, line)
  // 左右页上的文字行
  const rowH = Math.max(1, 0.018 * s)
  ;[0.30, 0.42, 0.54].forEach((p) => {
    const y = by0 + (by1 - by0) * p
    rect(bx0 + 0.06 * s, y, s * 0.47, y + rowH, line)
    rect(s * 0.53, y, bx1 - 0.06 * s, y + rowH, line)
  })
  // 露出的书签
  rect(s * 0.62, m + 0.05 * s, s * 0.68, by0, maskable ? CLAY : PAPER)

  return encodePNG(size, buf)
}

const files = [
  ['icon-180.png', 180, false],
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
]
for (const [name, size, maskable] of files) {
  writeFileSync(path.join(outDir, name), drawIcon(size, maskable))
  console.log('generated', name, size)
}
