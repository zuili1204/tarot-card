#!/usr/bin/env node
/**
 * 内容层同步管线（M2）：docs/content/（母版）→ src/data/content/（产物）
 * 纪律：src/data/content 一律由本脚本生成，不手改；文案改版只动母版。
 *
 * 校验（不过闸 exit 1）：
 *   1. 场景注册表：id 唯一、basedOn ∈ 11 域（含 general，见 10-占卜方向与场景拓展规划）
 *   2. 场景文案：78 key 全覆盖、字段完整、长度 warn（30-120）
 *   3. 金句：78 key 全覆盖、≤28 字 warn
 *   4. 位置模板：spreads.json 每个 position.tpl 都有对应模板（intro + 3 变体 callback）
 *   5. 关联表：16 组关系 × 4 正逆组合齐全
 *   6. 综合层：四件套 + 12 场景收束语 + 通用开场
 *   7. 合规闸：src/data 全部 json 扫禁词，block 级命中 exit 1（04 §8.3）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(root, '..', 'docs', 'content')
const DST = path.join(root, 'src', 'data', 'content')
const DATA = path.join(root, 'src', 'data')

const SUITS = ['wands', 'cups', 'swords', 'pentacles']
const RANKS = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'page', 'knight', 'queen', 'king']
const ALL_KEYS = [
  ...Array.from({ length: 22 }, (_, i) => `major-${i}`),
  ...SUITS.flatMap((s) => RANKS.map((r) => `${s}-${r}`)),
]

let errors = 0
let warnings = 0
const ok = (m) => console.log(`ℹ ${m}`)
const bad = (m) => { console.error(`✘ ${m}`); errors++ }
const warn = (m) => { console.warn(`⚠ ${m}`); warnings++ }

/* ---------- 1. 拷贝 ---------- */
fs.mkdirSync(DST, { recursive: true })
// 母版 docs/content/ 属于内部资料，不随仓库发布；缺失时进入「仅校验产物」模式，
// 直接用仓库内已有的 src/data/content/ 跑完校验，保证 clone 即可 npm run build。
const hasSource = fs.existsSync(SRC)
let jsonFiles = []
if (hasSource) {
  jsonFiles = fs.readdirSync(SRC).filter((f) => f.endsWith('.json'))
  for (const f of jsonFiles) {
    fs.copyFileSync(path.join(SRC, f), path.join(DST, f))
  }
  ok(`拷贝 ${jsonFiles.length} 个母版文件 → src/data/content/`)
} else {
  warn(`未找到内容母版 ${path.relative(root, SRC)}：进入「仅校验产物」模式（改文案需自备母版）`)
}

const load = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

/* ---------- 2. 合规闸（全 data 层） ---------- */
const compliance = load(path.join(DATA, 'compliance.json'))
const banned = compliance.banned
  .map((b) => ({ ...b, re: new RegExp(b.pattern, 'g') }))
  .sort((a, b) => b.pattern.length - a.pattern.length) // 长词优先

function scanFile(relPath) {
  const raw = fs.readFileSync(path.join(DATA, relPath), 'utf8')
  const compact = raw.replace(/\s+/g, '')
  for (const b of banned) {
    const hits = compact.match(b.re)
    if (!hits) continue
    if (b.level === 'block') bad(`[${relPath}] 禁词「${b.pattern}」×${hits.length}（${b.reason}）`)
    else warn(`[${relPath}] 提醒词「${b.pattern}」×${hits.length}（${b.reason}）`)
  }
  // 占位符拼接纪律：引擎替换 {timeframe} 时已带"个月"，模板再跟"个月"会叠词（2026-09-04 修过 3 处）
  if (compact.includes('{timeframe}个月')) bad(`[${relPath}] {timeframe} 后跟"个月"——引擎替换值已含"个月"，会叠成"个月个月"`)
  if (compact.includes('个月个月')) bad(`[${relPath}] 出现叠词"个月个月"`)
}
for (const f of ['cards.json', 'spreads.json']) scanFile(f)
// 合规词闸豁免（11 §6.1）：ai-prompt.json 是**给模型的约束指令**，必须原样列举禁用词才能
// 让模型避开它们——若连这里一起扫，等于禁止我们告诉模型"不许说这些词"。
// 该文件的约束改为下方 §3 的结构校验（字段齐全 + 立场条款非空）。
const SCAN_SKIP = new Set(['ai-prompt.json'])
for (const f of fs.readdirSync(DST).filter((x) => x.endsWith('.json'))) {
  if (SCAN_SKIP.has(f)) continue
  scanFile(`content/${f}`)
}

/* ---------- 3. 结构校验 ---------- */
const scenarios = load(path.join(DST, 'scenarios.json'))
const scIds = scenarios.scenarios.map((s) => s.id)
ok(`场景数 ${scenarios.scenarios.length}（扩展后不再硬编码 12）`)
if (new Set(scIds).size !== scIds.length) bad('场景 id 重复')
for (const s of scenarios.scenarios) {
  if (!['love', 'career', 'wealth', 'study', 'family', 'social', 'growth', 'wellbeing', 'place', 'create', 'general'].includes(s.basedOn)) bad(`场景 ${s.id} basedOn 非法：${s.basedOn}`)
  for (const k of ['nameZh', 'keywords', 'questionPatterns', 'intro']) {
    if (!s[k] || (Array.isArray(s[k]) && s[k].length === 0)) bad(`场景 ${s.id} 缺 ${k}`)
  }
}

const dstFiles = fs.readdirSync(DST).filter((x) => x.endsWith('.json'))
const scenarioFiles = (jsonFiles.length ? jsonFiles : dstFiles).filter((f) => f.startsWith('scenario-'))
ok(`场景文案文件 ${scenarioFiles.length}（扩展后不再硬编码 12）`)
for (const f of scenarioFiles) {
  const data = load(path.join(DST, f))
  const id = f.replace('scenario-', '').replace('.json', '')
  if (data.scenarioId !== id) bad(`[${f}] scenarioId=${data.scenarioId} 与文件名不符`)
  const keys = Object.keys(data.cards)
  const missing = ALL_KEYS.filter((k) => !keys.includes(k))
  if (missing.length) bad(`[${f}] 缺 ${missing.length} 个 card key：${missing.slice(0, 5).join(', ')}`)
  const extra = keys.filter((k) => !ALL_KEYS.includes(k))
  if (extra.length) bad(`[${f}] 多余 key：${extra.join(', ')}`)
  let short = 0, long = 0
  for (const [k, entry] of Object.entries(data.cards)) {
    for (const field of ['up', 'rev']) {
      const t = entry?.[field]
      if (!t || typeof t !== 'string') { bad(`[${f}] ${k}.${field} 缺失`); continue }
      if (t.length < 30) short++
      if (t.length > 120) long++
    }
  }
  if (short) warn(`[${f}] 过短(<30字) ${short} 处`)
  if (long) warn(`[${f}] 过长(>120字) ${long} 处`)
  ok(`[${f}] 覆盖 ${keys.length}/78`)
}

const quotes = load(path.join(DST, 'quotes.json'))
const qKeys = Object.keys(quotes.cards)
if (ALL_KEYS.some((k) => !qKeys.includes(k))) bad('quotes.json 缺 card key')
let qLong = 0
for (const [k, q] of Object.entries(quotes.cards)) {
  for (const field of ['up', 'rev']) if ((q[field] || '').length > 28) qLong++
}
if (qLong) warn(`[quotes.json] 金句过长(>28字) ${qLong} 处`)
ok(`[quotes.json] 覆盖 ${qKeys.length}/78`)

const spreads = load(path.join(DATA, 'spreads.json'))
const positionsTpl = load(path.join(DST, 'templates-positions.json'))
for (const sp of spreads.spreads) {
  for (const p of sp.positions) {
    const tpl = positionsTpl.positions[p.tpl]
    if (!tpl) { bad(`[spreads] ${sp.id} 位 ${p.no} tpl「${p.tpl}」无模板`); continue }
    if (!tpl.intro || !tpl.intro.includes('{card}')) bad(`[templates-positions] ${p.tpl}.intro 缺 {card}`)
    for (const v of ['direct', 'soft', 'neutral']) {
      if (!tpl.callback?.[v]) bad(`[templates-positions] ${p.tpl}.callback.${v} 缺失`)
    }
    if (!tpl.nameZh) bad(`[templates-positions] ${p.tpl}.nameZh 缺失`)
  }
}
ok(`位置模板覆盖 ${spreads.spreads.reduce((n, s) => n + s.positions.length, 0)} 个位`)

const links = load(path.join(DST, 'templates-links.json'))
const RELATIONS = [
  'wands-wands', 'cups-cups', 'swords-swords', 'pentacles-pentacles', 'major-major',
  'wands-swords', 'cups-pentacles', 'wands-cups', 'swords-pentacles',
  'wands-pentacles', 'cups-swords',
  'major-wands', 'major-cups', 'major-swords', 'major-pentacles',
]
for (const r of RELATIONS) {
  const rel = links.relations[r]
  if (!rel) { bad(`[templates-links] 缺关系 ${r}`); continue }
  for (const v of ['upUp', 'upRev', 'revUp', 'revRev']) {
    if (!rel[v]) bad(`[templates-links] ${r}.${v} 缺失`)
  }
}
if (!links.pairIntro || !links.pairIntroMild) bad('[templates-links] 缺 pairIntro/pairIntroMild')

const summary = load(path.join(DST, 'templates-summary.json'))
for (const k of ['high', 'mid', 'low']) if (!summary.trend?.[k]?.text) bad(`[templates-summary] trend.${k} 缺失`)
for (const k of ['none', 'few', 'many']) if (!summary.majorRatio?.[k]?.text) bad(`[templates-summary] majorRatio.${k} 缺失`)
for (const k of ['wands', 'cups', 'swords', 'pentacles', 'balanced']) {
  if (!summary.element?.[k]?.text) bad(`[templates-summary] element.${k} 缺失`)
}
for (const k of ['lead', 'single', 'empty']) if (!summary.action?.[k]) bad(`[templates-summary] action.${k} 缺失`)
if (!summary.intro?.generic) bad('[templates-summary] intro.generic 缺失')
for (const id of scIds) {
  if (!summary.scenarioClosing?.[id]) bad(`[templates-summary] scenarioClosing 缺 ${id}`)
}

const rituals = load(path.join(DST, 'rituals.json'))
for (const section of ['ask', 'shuffle', 'cut', 'draw', 'reveal', 'save', 'resultGuide', 'tasks']) {
  if (!rituals[section]) bad(`[rituals] 缺 ${section} 节`)
}

// 学习中心（07 §1.4）：三篇、字段完整、正文非空
// AI prompt 母版（11 §6.1）：不扫禁词，但必须结构完整——缺字段等于立场条款缺失
const aiPrompt = load(path.join(DST, 'ai-prompt.json'))
for (const k of ['role', 'output', 'labels']) {
  if (!aiPrompt[k]) bad(`[ai-prompt] 缺 ${k}`)
}
if (!Array.isArray(aiPrompt.stance) || aiPrompt.stance.length === 0) bad('[ai-prompt] stance 为空')
for (const k of [
  'question', 'domain', 'scenario', 'sub', 'subNone',
  'timeframe', 'spread', 'cards', 'links', 'upright', 'reversed', 'closing',
]) {
  if (!aiPrompt.labels?.[k]) bad(`[ai-prompt] labels 缺 ${k}`)
}

const learn = load(path.join(DST, 'learn.json'))
if (!Array.isArray(learn.articles) || learn.articles.length !== 3) bad(`[learn] 文章数 ${learn.articles?.length ?? 0} ≠ 3`)
for (const a of learn.articles ?? []) {
  for (const k of ['id', 'title', 'subtitle', 'minutes', 'sections']) {
    if (!a[k]) bad(`[learn] ${a.id ?? '?'} 缺 ${k}`)
  }
  if (!Array.isArray(a.sections) || a.sections.length === 0) bad(`[learn] ${a.id} sections 为空`)
  for (const s of a.sections ?? []) {
    if (s.type === 'list' ? !s.items?.length : !s.text) bad(`[learn] ${a.id} 有空 section（type=${s.type}）`)
  }
}
ok(`[learn] ${learn.articles?.length ?? 0} 篇，共 ${(learn.articles ?? []).reduce((n, a) => n + (a.sections?.length ?? 0), 0)} 段`)

/* ---------- 结果 ---------- */
console.log('\n===== 内容同步结果 =====')
console.log(`block 违规：${errors}（必须修复）  warn 提醒：${warnings}（人工复核）`)
if (errors > 0) {
  console.error('内容闸未通过，产物不可用。')
  process.exit(1)
}
ok('内容闸通过。')
