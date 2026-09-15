// parse-cards.mjs —— 02 母版（docs/02-塔罗牌解读体系.md）机械转录为 src/data/cards.json
// 纪律：只转录不创作；任何字段缺失即报错终止，保证 78 张零缺文案。
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const MD = join(here, '../../docs/02-塔罗牌解读体系.md')
const OUT = join(here, '../src/data/cards.json')

const ROMAN = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI']
// 大牌元素（守护星座/行星主元素，05 §2.2 死神=水 一致）
const MAJOR_ELEMENT = ['风','风','水','土','火','土','风','水','火','土','火','风','水','水','火','土','火','风','水','火','水','土']
const SUIT_MAP = { 权杖: 'wands', 圣杯: 'cups', 宝剑: 'swords', 星币: 'pentacles' }
const SUIT_ELEMENT = { wands: '火', cups: '水', swords: '风', pentacles: '土' }
const SUIT_EN = { wands: 'Wands', cups: 'Cups', swords: 'Swords', pentacles: 'Pentacles' }
const SUIT_TAG = { wands: 'fire', cups: 'water', swords: 'air', pentacles: 'earth' }
const RANK_MAP = { 侍从: 'page', 骑士: 'knight', 王后: 'queen', 国王: 'king' }
const NUM_EN = { 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten' }
const DOMAIN_FIELDS = { 核心: 'core', 爱情: 'love', 事业: 'career', 财运: 'wealth' }

const md = readFileSync(MD, 'utf8')
const lines = md.split(/\r?\n/)

// 按 "#### " 切块
const blocks = []
let cur = null
for (const line of lines) {
  if (line.startsWith('#### ')) {
    if (cur) blocks.push(cur)
    cur = { title: line.slice(5).trim(), fields: [] }
  } else if (cur && line.startsWith('- **')) {
    cur.fields.push(line)
  }
}
if (cur) blocks.push(cur)

const cards = []
const errors = []
const warns = []

for (const b of blocks) {
  const title = b.title
  let suit, rank, nameZh, nameEn, number = null, astrology = null

  if (title.includes('｜')) {
    // 大阿卡纳：#### XIII 死神 Death ｜ ♏ 天蝎座
    const [left, right] = title.split('｜').map((s) => s.trim())
    const tokens = left.split(/\s+/)
    number = tokens[0]
    nameZh = tokens[1]
    nameEn = tokens.slice(2).join(' ')
    suit = 'major'
    const idx = ROMAN.indexOf(number)
    if (idx < 0) { errors.push(`[${title}] 无法识别罗马数字 ${number}`); continue }
    rank = String(idx)
    astrology = (right.match(/[一-龥]+$/) || [null])[0]
  } else {
    // 小阿卡纳：#### 权杖 3 / #### 权杖 Ace / #### 权杖侍从 Page of Wands（花色与牌阶间空格可选）
    const m = title.match(/^(权杖|圣杯|宝剑|星币)\s*(Ace|\d+|侍从|骑士|王后|国王)(?:\s+(.*))?$/)
    if (!m) { errors.push(`[${title}] 无法解析小牌标题`); continue }
    const [, suitZh, r, enTail] = m
    suit = SUIT_MAP[suitZh]
    if (r === 'Ace') rank = 'ace'
    else if (/^\d+$/.test(r)) rank = r
    else rank = RANK_MAP[r]
    nameZh = suitZh + (/^(Ace|\d+)$/.test(r) ? ' ' : '') + r
    nameEn = (enTail || '').trim() || (rank === 'ace' ? `Ace of ${SUIT_EN[suit]}` : `${NUM_EN[Number(rank)]} of ${SUIT_EN[suit]}`)
  }

  const card = {
    id: `${suit}-${rank}`,
    suit,
    rank,
    nameZh,
    nameEn,
    number: suit === 'major' ? number : null,
    astrology,
    element: suit === 'major' ? MAJOR_ELEMENT[Number(rank)] : SUIT_ELEMENT[suit],
    image: `${suit}-${rank}.jpg`,
    keywords: { up: [], rev: [] },
    core: { up: '', rev: '' },
    domains: { love: { up: '', rev: '' }, career: { up: '', rev: '' }, wealth: { up: '', rev: '' } },
    advice: '',
    yesNo: 'vague',
    tags: suit === 'major' ? ['major'] : [SUIT_TAG[suit]],
  }

  for (const f of b.fields) {
    const m = f.match(/^- \*\*(.+?)\*\*[：:](.*)$/)
    if (!m) { errors.push(`[${title}] 字段行无法解析：${f}`); continue }
    const [, key, rest] = m

    if (key === '关键词') {
      const parts = rest.split('｜')
      const up = (parts[0] || '').trim().replace(/^正：/, '').split('·').map((s) => s.trim()).filter(Boolean)
      const rev = (parts[1] || '').trim().replace(/^逆：/, '').split('·').map((s) => s.trim()).filter(Boolean)
      card.keywords = { up, rev }
    } else if (DOMAIN_FIELDS[key]) {
      const i = rest.indexOf('逆：')
      if (i < 0) { errors.push(`[${title}] ${key} 缺"逆："分界：${rest}`); continue }
      const up = rest.slice(0, i).replace(/^正：/, '').trim()
      const rev = rest.slice(i + 2).trim()
      if (key === '核心') card.core = { up, rev }
      else card.domains[DOMAIN_FIELDS[key]] = { up, rev }
    } else if (key === '建议') {
      card.advice = rest.trim()
    } else if (key === '是/否') {
      const hasYes = /["“]是["”]/.test(rest)
      const hasNo = /["“]否["”]/.test(rest)
      const hasVague = /模糊/.test(rest)
      if (hasVague) card.yesNo = 'vague'
      else if (hasYes) card.yesNo = 'yes'
      else if (hasNo) card.yesNo = 'no'
      else errors.push(`[${title}] 是/否无法映射：${rest}`)
    }
  }
  cards.push(card)
}

// —— 全量校验 ——
const expectedIds = new Set([
  ...ROMAN.map((_, i) => `major-${i}`),
  ...Object.values(SUIT_MAP).flatMap((s) => ['ace','2','3','4','5','6','7','8','9','10','page','knight','queen','king'].map((r) => `${s}-${r}`)),
])
const gotIds = new Set(cards.map((c) => c.id))
for (const id of expectedIds) if (!gotIds.has(id)) errors.push(`缺牌：${id}`)
for (const c of cards) {
  for (const k of ['nameZh','nameEn','advice']) if (!c[k]) errors.push(`[${c.id}] ${k} 为空`)
  for (const k of ['up','rev']) if (!c.keywords[k].length) errors.push(`[${c.id}] keywords.${k} 为空`)
  for (const k of ['up','rev']) if (!c.core[k]) errors.push(`[${c.id}] core.${k} 为空`)
  for (const d of ['love','career','wealth']) for (const k of ['up','rev']) if (!c.domains[d][k]) errors.push(`[${c.id}] domains.${d}.${k} 为空`)
  // 长度约束（05 §2.2）：超标仅告警，由母版定夺
  for (const k of ['up','rev']) if (c.core[k].length > 120) warns.push(`[${c.id}] core.${k} ${c.core[k].length} 字 >120`)
  for (const d of ['love','career','wealth']) for (const k of ['up','rev']) if (c.domains[d][k].length > 80) warns.push(`[${c.id}] ${d}.${k} ${c.domains[d][k].length} 字 >80`)
  if (c.advice.length > 40) warns.push(`[${c.id}] advice ${c.advice.length} 字 >40`)
}

if (errors.length) {
  console.error(`✗ ${errors.length} 处错误：\n` + errors.join('\n'))
  process.exit(1)
}

const out = {
  version: '1.0.0',
  updatedAt: '2026-09-04',
  cards,
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log(`✓ 转录 ${cards.length}/78 张 → ${OUT}`)
console.log(`  是=${cards.filter((c) => c.yesNo === 'yes').length} 否=${cards.filter((c) => c.yesNo === 'no').length} 模糊=${cards.filter((c) => c.yesNo === 'vague').length}`)
if (warns.length) console.log(`⚠ ${warns.length} 条长度告警：\n  ` + warns.join('\n  '))
