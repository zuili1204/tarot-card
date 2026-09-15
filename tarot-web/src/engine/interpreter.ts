// 静态组装引擎（02 §5 的实现，04 §4.2）：单牌段 → 关联位段 → 综合结论四件套
// 纪律：模板变量全部来自 data 层，引擎零硬编码文案；产文即快照，随 Reading 落库。
import {
  cardMap,
  linkTemplates,
  positionTemplates,
  scenarioMap,
  scenarioTexts,
  subScenarioMap,
  summaryTemplates,
} from '@/data'
import { soften } from './compliance'
import type {
  CallbackVariant,
  Card,
  DrawnCard,
  LinkReading,
  PositionReading,
  Question,
  ReadingInterpretation,
  Spread,
  SummaryReading,
} from '@/types'

/** 苦牌（templates-positions 母版注记：宝剑3/9/10、恶魔、塔、月亮）——即使正位也走 soft 变体 */
const BITTER = new Set(['swords-3', 'swords-9', 'swords-10', 'major-15', 'major-16', 'major-18'])

export function composeReading(input: {
  question: Question
  spread: Spread
  cards: DrawnCard[]
}): ReadingInterpretation {
  const { question, spread, cards } = input
  const byNo = new Map(cards.map((c) => [c.positionNo, c]))
  const scenario = question.scenarioId ? scenarioMap.get(question.scenarioId) : undefined
  // 子情境（10 §5.2）：只覆盖开场白 / 收束语，牌义沿用父场景→域→核心
  const subScenario = question.subScenarioId ? subScenarioMap.get(question.subScenarioId) : undefined

  const positions: PositionReading[] = spread.positions.map((p) => {
    const d = byNo.get(p.no)
    const card = d ? cardMap.get(d.cardId) : undefined
    const tpl = positionTemplates[p.tpl]
    if (!d || !card || !tpl) return {
      positionNo: p.no,
      positionName: p.name,
      cardId: d?.cardId ?? '',
      reversed: d?.reversed ?? false,
      variant: 'neutral',
      text: '',
    }
    const variant = pickVariant(card, d.reversed)
    const intro = tpl.intro.replace('{card}', card.nameZh).replace('{revMark}', d.reversed ? '（逆位）' : '')
    const text = soften(intro + bodyText(card, d.reversed, question, scenario) + tpl.callback[variant])
    return { positionNo: p.no, positionName: p.name, cardId: card.id, reversed: d.reversed, variant, text }
  })

  const links: LinkReading[] = spread.links.map((l, i) => {
    const da = byNo.get(l.a)
    const db = byNo.get(l.b)
    const pa = spread.positions.find((p) => p.no === l.a)
    const pb = spread.positions.find((p) => p.no === l.b)
    const ca = da ? cardMap.get(da.cardId) : undefined
    const cb = db ? cardMap.get(db.cardId) : undefined
    if (!da || !db || !ca || !cb || !pa || !pb) {
      return { a: l.a, b: l.b, type: l.type, label: '', text: '' }
    }
    const rel = linkTemplates.relations[relationKey(ca, cb)]
    if (!rel) return { a: l.a, b: l.b, type: l.type, label: '', text: '' }
    const combo: 'upUp' | 'upRev' | 'revUp' | 'revRev' =
      !da.reversed && !db.reversed ? 'upUp' : !da.reversed ? 'upRev' : db.reversed ? 'revRev' : 'revUp'
    const introTpl = i === 0 ? linkTemplates.pairIntro : linkTemplates.pairIntroMild
    const intro = introTpl
      .replace('{aPos}', pa.name)
      .replace('{aCard}', withRevMark(ca, da.reversed))
      .replace('{bPos}', pb.name)
      .replace('{bCard}', withRevMark(cb, db.reversed))
    return { a: l.a, b: l.b, type: l.type, label: rel.label, text: soften(intro + rel[combo]) }
  })

  const summary = composeSummary(question, cards)
  const closing = subScenario?.closing ?? (scenario ? summaryTemplates.scenarioClosing[scenario.id] ?? null : null)
  const intro = subScenario?.intro ?? scenario?.intro ?? summaryTemplates.intro.generic

  return { intro, positions, links, summary, closing }
}

/** 变体选择（templates-positions 母版规则）：逆位或苦牌→soft；正位吉牌（倾向是）→direct；其余→neutral */
function pickVariant(card: Card, reversed: boolean): CallbackVariant {
  if (reversed || BITTER.has(card.id)) return 'soft'
  if (card.yesNo === 'yes') return 'direct'
  return 'neutral'
}

/** 单牌段正文：L3 场景文案 → L2 三域牌义 → L1 核心牌义（逐层降级） */
function bodyText(card: Card, reversed: boolean, question: Question, scenario?: { id: string }): string {
  const dir = reversed ? 'rev' : 'up'
  const s = scenario ? scenarioTexts[scenario.id]?.cards[card.id]?.[dir] : undefined
  if (s) return s
  const d = card.domains[question.domain]?.[dir]
  if (d) return d
  return card.core[dir]
}

/** 元素关系键：major 恒在前；其余按词表既有顺序（火>水>风>土）规范化 */
function relationKey(a: Card, b: Card): string {
  const ea = a.suit === 'major' ? 'major' : a.suit
  const eb = b.suit === 'major' ? 'major' : b.suit
  if (ea === eb) return `${ea}-${eb}`
  if (ea === 'major' || eb === 'major') {
    const other = ea === 'major' ? eb : ea
    return `major-${other}`
  }
  const order = ['wands', 'cups', 'swords', 'pentacles']
  const [x, y] = order.indexOf(ea) <= order.indexOf(eb) ? [ea, eb] : [eb, ea]
  // 词表覆盖全部 6 个有序跨花色组合（火>水>风>土序）
  return `${x}-${y}`
}

function withRevMark(card: Card, reversed: boolean): string {
  return card.nameZh + (reversed ? '（逆位）' : '')
}

/** 综合结论四件套：正逆占比三档 / 大阿卡纳占比三档 / 元素分布 / 建议聚合 */
function composeSummary(question: Question, cards: DrawnCard[]): SummaryReading {
  const n = cards.length
  const drawnCards = cards.map((d) => cardMap.get(d.cardId)).filter((c): c is Card => !!c)
  const timeframe = `${question.timeframeMonths}个月`

  const upright = cards.filter((d) => !d.reversed).length
  const ratio = n > 0 ? upright / n : 0
  const trendKey = ratio >= 2 / 3 ? 'high' : ratio <= 1 / 3 ? 'low' : 'mid'
  const trend = summaryTemplates.trend[trendKey]

  const majorCount = drawnCards.filter((c) => c.suit === 'major').length
  const majorKey = majorCount === 0 ? 'none' : majorCount / Math.max(n, 1) > 1 / 3 ? 'many' : 'few'

  const suitCount: Record<'wands' | 'cups' | 'swords' | 'pentacles', number> = { wands: 0, cups: 0, swords: 0, pentacles: 0 }
  for (const c of drawnCards) if (c.suit !== 'major') suitCount[c.suit]++
  const topSuit = (Object.keys(suitCount) as ('wands' | 'cups' | 'swords' | 'pentacles')[]).reduce((a, b) =>
    suitCount[a] >= suitCount[b] ? a : b,
  )
  const elementKey: 'wands' | 'cups' | 'swords' | 'pentacles' | 'balanced' =
    suitCount[topSuit] >= n / 2 ? topSuit : 'balanced'

  const actions: string[] = []
  for (let i = 0; i < cards.length && actions.length < 3; i++) {
    const c = cardMap.get(cards[i].cardId)
    if (c?.advice && !actions.includes(c.advice)) actions.push(c.advice)
  }
  const actionLead = actions.length === 0 ? summaryTemplates.action.empty
    : actions.length === 1 ? summaryTemplates.action.single
    : summaryTemplates.action.lead

  return {
    trendLabel: trend.label,
    trendText: soften(trend.text.replace('{timeframe}', timeframe)),
    majorText: summaryTemplates.majorRatio[majorKey].text,
    elementText: summaryTemplates.element[elementKey].text,
    actionLead,
    actions,
  }
}
