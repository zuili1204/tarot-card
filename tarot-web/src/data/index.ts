// 数据层统一出口（04 §2：views 只从此处取数，不直接散引 json）
import rawCards from './cards.json'
import rawSpreads from './spreads.json'
import rawCompliance from './compliance.json'
import rawScenarios from './content/scenarios.json'
import rawPositions from './content/templates-positions.json'
import rawLinks from './content/templates-links.json'
import rawSummary from './content/templates-summary.json'
import rawRituals from './content/rituals.json'
import rawQuotes from './content/quotes.json'
import rawLearn from './content/learn.json'
import rawSubScenarios from './content/sub-scenarios.json'
import rawAiPrompt from './content/ai-prompt.json'
import type {
  BannedWord,
  Card,
  LearnArticle,
  LinkRelation,
  PositionTemplate,
  Scenario,
  Spread,
  SubScenario,
} from '@/types'

export const CARDS_VERSION = `${rawCards.version}`
export const CARDS_UPDATED_AT = rawCards.updatedAt

/** 78 张，按 02 母版顺序：22 大阿卡纳 + 权杖/圣杯/宝剑/星币 */
export const cards = rawCards.cards as Card[]

export const cardMap = new Map(cards.map((c) => [c.id, c]))

export const spreads = (rawSpreads as { version: string; updatedAt: string; spreads: Spread[] }).spreads
export const spreadMap = new Map(spreads.map((s) => [s.id, s]))

/** 词典分组：大阿卡纳 + 四花色 */
export const SUIT_SECTIONS: { key: Card['suit']; nameZh: string; sub: string }[] = [
  { key: 'major', nameZh: '大阿卡纳', sub: '0-XXI · 命运的大戏' },
  { key: 'wands', nameZh: '权杖', sub: '火 · 行动与热情' },
  { key: 'cups', nameZh: '圣杯', sub: '水 · 情感与关系' },
  { key: 'swords', nameZh: '宝剑', sub: '风 · 心智与冲突' },
  { key: 'pentacles', nameZh: '星币', sub: '土 · 现实与物质' },
]

/** 宫廷牌阶中文名（牌面中央单字用） */
export const COURT_GLYPH: Record<string, string> = { page: '侍', knight: '骑', queen: '后', king: '王' }

export function cardsOfSuit(suit: Card['suit']): Card[] {
  return cards.filter((c) => c.suit === suit)
}

/** 按 id 找相邻牌（词典详情页上/下一张） */
export function neighborCards(id: string): { prev: Card | null; next: Card | null } {
  const i = cards.findIndex((c) => c.id === id)
  if (i < 0) return { prev: null, next: null }
  return { prev: cards[i - 1] ?? null, next: cards[i + 1] ?? null }
}

/* ---------- 内容层出口（M2，母版 docs/content 经 sync-content 同步） ---------- */

export const scenarios = rawScenarios.scenarios as Scenario[]
export const scenarioMap = new Map(scenarios.map((s) => [s.id, s]))

/** 子情境层（10 §5.2）：无牌义，只给开场白 / 收束语 / 关键词 / 推荐牌阵 */
export const subScenarios = (rawSubScenarios as { items: SubScenario[] }).items
export const subScenarioMap = new Map(subScenarios.map((s) => [s.id, s]))
/** 按父场景分组：Ask 页选中场景后列出可选子情境 */
export const subScenariosByParent: Record<string, SubScenario[]> = {}
for (const s of subScenarios) {
  if (!subScenariosByParent[s.parent]) subScenariosByParent[s.parent] = []
  subScenariosByParent[s.parent].push(s)
}

/** 12 场景 × 78 牌的场景文案（L3 层） */
const scenarioModules = import.meta.glob<{ scenarioId: string; cards: Record<string, { up: string; rev: string }> }>(
  './content/scenario-*.json',
  { eager: true, import: 'default' },
)
export const scenarioTexts: Record<string, { cards: Record<string, { up: string; rev: string }> }> = {}
for (const mod of Object.values(scenarioModules)) scenarioTexts[mod.scenarioId] = mod

/** 位置模板（L4 层）：spreads positions[].tpl → 模板 */
export const positionTemplates = rawPositions.positions as unknown as Record<string, PositionTemplate>

/** 关联位叙述（元素关系矩阵）：pairIntro / pairIntroMild / relations */
export const linkTemplates = rawLinks as unknown as {
  pairIntro: string
  pairIntroMild: string
  relations: Record<string, LinkRelation>
}

/** 综合结论四件套模板 */
export const summaryTemplates = rawSummary as unknown as {
  intro: { generic: string }
  trend: Record<'high' | 'mid' | 'low', { label: string; text: string }>
  majorRatio: Record<'none' | 'few' | 'many', { text: string }>
  element: Record<'wands' | 'cups' | 'swords' | 'pentacles' | 'balanced', { text: string }>
  action: { lead: string; single: string; empty: string }
  scenarioClosing: Record<string, string>
}

/** 全流程界面文案（Ask/Draw/Result 等视图引用，零硬编码） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const rituals = rawRituals as any

/** 分享金句：78 牌 × 正逆 */
export const quotes = rawQuotes.cards as Record<string, { up: string; rev: string }>

/** 学习中心三篇（07 §1.4，S7） */
export const learnArticles = rawLearn.articles as LearnArticle[]
export const learnMap = new Map(learnArticles.map((a) => [a.id, a]))

/** 合规词表（05 §4.2，构建闸与运行时兜底共用） */
export const bannedWords = rawCompliance.banned as BannedWord[]

/**
 * AI prompt 母版（11 §6.1）：独立于 rituals，因为它的立场条款必须原样列举禁用词，
 * 不参与面向用户的合规词闸（改为 sync-content.mjs 的结构校验）。
 */
export const aiPrompt = rawAiPrompt as {
  version: number
  role: string
  stance: string[]
  output: string
  labels: Record<string, string>
}
