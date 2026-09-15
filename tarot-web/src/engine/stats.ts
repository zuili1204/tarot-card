// Mirror 统计（03 §3.1 Labyrinthos / 09 N4）：全部由本地历史算出，不需要后端。
// 定位是"照见自己"而不是"预测"——最常出现的牌往往就是反复遇见的那个课题。
import { cardMap } from '@/data'
import type { Card, ReadingSnapshot, Suit } from '@/types'

export interface CardStat {
  cardId: string
  nameZh: string
  count: number
}

export interface BucketStat {
  key: string
  nameZh: string
  count: number
}

export interface DeckStats {
  /** 占卜次数 */
  readings: number
  /** 累计抽牌张数 */
  drawn: number
  /** 逆位率 0-1（无记录时为 0） */
  reversedRate: number
  /** 出现最多的牌（并列按次数降序，最多 5 张） */
  topCards: CardStat[]
  /** 牌组分布：大阿卡纳 + 四花色 */
  suitDist: BucketStat[]
  /** 问题域分布 */
  domainDist: BucketStat[]
  /** 首次到最近一次占卜的跨度天数（无记录为 0） */
  spanDays: number
}

const SUIT_NAME: Record<Suit, string> = {
  major: '大阿卡纳',
  wands: '权杖 · 火',
  cups: '圣杯 · 水',
  swords: '宝剑 · 风',
  pentacles: '星币 · 土',
}

/** 域中文名（10 §13）；AI 上下文与统计共用，缺失时回退 key 原文 */
export const DOMAIN_NAME: Record<string, string> = {
  love: '感情',
  career: '事业',
  wealth: '财运',
  study: '学业',
  family: '家庭',
  social: '人际',
  growth: '自我成长',
  wellbeing: '身心状态',
  place: '居住安置',
  create: '创作表达',
  general: '综合',
}

export function computeStats(list: ReadingSnapshot[]): DeckStats {
  const cardHits = new Map<string, number>()
  const suitHits = new Map<string, number>()
  const domainHits = new Map<string, number>()
  let drawn = 0
  let reversed = 0

  for (const r of list) {
    domainHits.set(r.question?.domain ?? 'general', (domainHits.get(r.question?.domain ?? 'general') ?? 0) + 1)
    for (const d of r.cards ?? []) {
      drawn++
      if (d.reversed) reversed++
      cardHits.set(d.cardId, (cardHits.get(d.cardId) ?? 0) + 1)
      const card: Card | undefined = cardMap.get(d.cardId)
      if (card) suitHits.set(card.suit, (suitHits.get(card.suit) ?? 0) + 1)
    }
  }

  const topCards: CardStat[] = [...cardHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cardId, count]) => ({ cardId, nameZh: cardMap.get(cardId)?.nameZh ?? cardId, count }))

  const suitDist: BucketStat[] = [...suitHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, nameZh: SUIT_NAME[key as Suit] ?? key, count }))

  const domainDist: BucketStat[] = [...domainHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, nameZh: DOMAIN_NAME[key] ?? key, count }))

  return {
    readings: list.length,
    drawn,
    reversedRate: drawn > 0 ? reversed / drawn : 0,
    topCards,
    suitDist,
    domainDist,
    spanDays: spanDays(list),
  }
}

function spanDays(list: ReadingSnapshot[]): number {
  if (list.length === 0) return 0
  const times = list.map((r) => Date.parse(r.createdAt)).filter((t) => !Number.isNaN(t))
  if (times.length === 0) return 0
  const min = Math.min(...times)
  const max = Math.max(...times)
  return Math.max(1, Math.round((max - min) / 86400000) + 1)
}
