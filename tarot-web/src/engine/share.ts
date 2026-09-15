// 分享图生成（04 §1 Canvas 2D 路线，05 §6.2 底版规范）：
// 1080×1920 竖版；牌面 + 关键词 + 金句 + 二维码；免责声明角落小字常驻（M3 验收点）。
// 问题文本不上图（rituals.share.hint 的产品承诺）。
import QRCode from 'qrcode'

export interface ShareCard {
  image: string // public/cards 下的文件名
  nameZh: string
  reversed: boolean
  keywords: string[]
}

export interface ShareInput {
  spreadName: string
  cards: ShareCard[]
  quote: string
  url: string // 二维码指向（hash 路由绝对地址）
}

const W = 1080
const H = 1920
const DISCLAIMER = [
  '本内容为传统文化体验与自我探索工具，仅供娱乐参考。',
  '重大决策请咨询专业人士。',
]

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`share: 图片加载失败 ${src}`))
    img.src = src
  })
}

/** 按字符宽度折行（CJK 语境逐字测量即可） */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth) {
      lines.push(line)
      line = ch
    } else {
      line += ch
    }
  }
  if (line) lines.push(line)
  return lines
}

/** 布局：n 张牌 → 行分组与单元宽（7:12 比例） */
function planRows(n: number): { rows: number[][]; cardW: number; showKeywords: boolean; showNames: boolean } {
  const idx = Array.from({ length: n }, (_, i) => i)
  if (n === 1) return { rows: [idx], cardW: 340, showKeywords: true, showNames: true }
  if (n <= 3) return { rows: [idx], cardW: 260, showKeywords: true, showNames: true }
  if (n <= 6) {
    const half = Math.ceil(n / 2)
    return { rows: [idx.slice(0, half), idx.slice(half)], cardW: 230, showKeywords: false, showNames: true }
  }
  if (n <= 8) {
    const half = Math.ceil(n / 2)
    return { rows: [idx.slice(0, half), idx.slice(half)], cardW: 200, showKeywords: false, showNames: true }
  }
  // 10 张：4+4+2
  return {
    rows: [idx.slice(0, 4), idx.slice(4, 8), idx.slice(8)],
    cardW: 200,
    showKeywords: false,
    showNames: false,
  }
}

export async function generateShareImage(input: ShareInput): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  /* 背景：纵向渐变 + 金尘星点（LCG 定种子，视觉稳定可复现） */
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#100d1c')
  bg.addColorStop(0.5, '#0d0b16')
  bg.addColorStop(1, '#141021')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  let seed = 20260904
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  for (let i = 0; i < 90; i++) {
    const x = rand() * W
    const y = rand() * H
    const r = rand() * 1.8 + 0.4
    ctx.fillStyle = `rgba(212, 175, 55, ${0.06 + rand() * 0.16})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // 金色外框发丝线
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)'
  ctx.lineWidth = 2
  ctx.strokeRect(28, 28, W - 56, H - 56)

  /* 头部：品牌 + 阵名 */
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(212, 175, 55, 0.75)'
  ctx.font = '500 30px "Georgia", serif'
  ctx.fillText('T A R O T · C A R D', W / 2, 108)
  ctx.fillStyle = '#e8cf8a'
  ctx.font = '600 64px "Noto Serif SC", "Songti SC", "SimSun", serif'
  ctx.fillText(input.spreadName, W / 2, 196)
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(W / 2 - 160, 240)
  ctx.lineTo(W / 2 + 160, 240)
  ctx.stroke()

  /* 牌面区 */
  const { rows, cardW, showKeywords, showNames } = planRows(input.cards.length)
  const cardH = Math.round((cardW * 12) / 7)
  const rowGap = showNames ? 88 : 30
  const blockH = rows.length * cardH + (rows.length - 1) * rowGap
  let y = 320 + Math.max(0, (H - 1180 - blockH) / 2) * 0.2

  // 预加载全部牌面（同源，无 canvas 污染）
  const base = import.meta.env.BASE_URL + 'cards/'
  const imgs = await Promise.all(input.cards.map((c) => loadImage(base + c.image)))

  for (const row of rows) {
    const rowW = row.length * cardW + (row.length - 1) * 40
    let x = (W - rowW) / 2
    for (const i of row) {
      const c = input.cards[i]
      const cx = x + cardW / 2
      const cy = y + cardH / 2
      ctx.save()
      ctx.translate(cx, cy)
      if (c.reversed) ctx.rotate(Math.PI)
      ctx.drawImage(imgs[i], -cardW / 2, -cardH / 2, cardW, cardH)
      ctx.restore()
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(x, y, cardW, cardH)

      if (showNames) {
        ctx.fillStyle = '#f0e6d2'
        ctx.font = '500 30px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'
        ctx.fillText(`${c.nameZh}${c.reversed ? ' ◆' : ' ◇'}`, cx, y + cardH + 44)
      }
      if (showKeywords) {
        ctx.fillStyle = 'rgba(212, 175, 55, 0.9)'
        ctx.font = '400 26px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'
        ctx.fillText(c.keywords.slice(0, 2).join(' · '), cx, y + cardH + 80)
      }
      x += cardW + 40
    }
    y += cardH + rowGap
  }

  /* 金句 */
  if (input.quote) {
    ctx.fillStyle = 'rgba(240, 230, 210, 0.92)'
    ctx.font = '500 44px "Noto Serif SC", "Songti SC", "SimSun", serif'
    const lines = wrapText(ctx, `「${input.quote}」`, 860)
    let qy = y + 70
    for (const line of lines) {
      ctx.fillText(line, W / 2, qy)
      qy += 64
    }
  }

  /* 二维码（hash 路由绝对地址） */
  const qrData = await QRCode.toDataURL(input.url, {
    margin: 1,
    width: 320,
    color: { dark: '#d4af37ff', light: '#0d0b16ff' },
  })
  const qr = await loadImage(qrData)
  ctx.drawImage(qr, W / 2 - 110, 1560, 220, 220)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.font = '400 26px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText('扫码回看这次占卜（仅本机有效）', W / 2, 1824)

  /* 免责声明：角落常驻（验收点） */
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)'
  ctx.font = '400 24px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText(DISCLAIMER[0], W / 2, 1868)
  ctx.fillText(DISCLAIMER[1], W / 2, 1902)

  return canvas.toDataURL('image/png')
}
