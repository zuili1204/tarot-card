// Mirror 统计（03 §3.1 / 09 N4）：纯函数，直接喂历史记录即可
import { describe, expect, it } from 'vitest'
import { computeStats } from '@/engine/stats'
import type { DrawnCard, ReadingSnapshot } from '@/types'

function reading(id: string, cards: DrawnCard[], domain: 'love' | 'career' | 'wealth' | 'general' = 'love', day = 1): ReadingSnapshot {
  return {
    id,
    createdAt: `2026-09-0${day}T12:00:00.000Z`,
    question: { text: '测试', domain, timeframeMonths: 3 },
    spreadId: 'three-timeline',
    cards,
    deckSnapshot: cards.map((c) => c.cardId),
    cutIndex: 1,
    interpretation: {
      intro: '',
      positions: [],
      links: [],
      summary: { trendLabel: '', trendText: '', majorText: '', elementText: '', actionLead: '', actions: [] },
      closing: null,
    },
  }
}

describe('computeStats', () => {
  it('无记录时全部归零，不产生 NaN', () => {
    const s = computeStats([])
    expect(s.readings).toBe(0)
    expect(s.drawn).toBe(0)
    expect(s.reversedRate).toBe(0)
    expect(s.topCards).toEqual([])
    expect(s.spanDays).toBe(0)
  })

  it('次数、张数、逆位率统计正确', () => {
    const list = [
      reading('a', [
        { cardId: 'major-0', reversed: false, positionNo: 1 },
        { cardId: 'cups-ace', reversed: true, positionNo: 2 },
      ]),
      reading('b', [{ cardId: 'major-0', reversed: true, positionNo: 1 }], 'career', 3),
    ]
    const s = computeStats(list)
    expect(s.readings).toBe(2)
    expect(s.drawn).toBe(3)
    expect(s.reversedRate).toBeCloseTo(2 / 3)
  })

  it('最常出现的牌按次数降序，取前 5', () => {
    const cards: DrawnCard[] = [
      { cardId: 'major-0', reversed: false, positionNo: 1 },
      { cardId: 'major-0', reversed: false, positionNo: 2 },
      { cardId: 'major-0', reversed: false, positionNo: 3 },
      { cardId: 'cups-ace', reversed: false, positionNo: 4 },
      { cardId: 'cups-ace', reversed: false, positionNo: 5 },
      { cardId: 'wands-ace', reversed: false, positionNo: 6 },
    ]
    const s = computeStats([reading('a', cards)])
    expect(s.topCards[0]).toMatchObject({ cardId: 'major-0', count: 3 })
    expect(s.topCards[1]).toMatchObject({ cardId: 'cups-ace', count: 2 })
    expect(s.topCards.length).toBeLessThanOrEqual(5)
  })

  it('牌组与问题域分布正确', () => {
    const list = [
      reading('a', [
        { cardId: 'major-0', reversed: false, positionNo: 1 },
        { cardId: 'wands-ace', reversed: false, positionNo: 2 },
      ]),
      reading('b', [{ cardId: 'wands-2', reversed: false, positionNo: 1 }], 'career'),
    ]
    const s = computeStats(list)
    const suitMap = new Map(s.suitDist.map((x) => [x.key, x.count]))
    expect(suitMap.get('major')).toBe(1)
    expect(suitMap.get('wands')).toBe(2)

    const domainMap = new Map(s.domainDist.map((x) => [x.key, x.count]))
    expect(domainMap.get('love')).toBe(1)
    expect(domainMap.get('career')).toBe(1)
  })

  it('时间跨度按天计算（含首日）', () => {
    const list = [
      reading('a', [{ cardId: 'major-0', reversed: false, positionNo: 1 }], 'love', 1),
      reading('b', [{ cardId: 'major-1', reversed: false, positionNo: 1 }], 'love', 3),
    ]
    expect(computeStats(list).spanDays).toBe(3)
  })

  it('未知牌 id 不会让统计崩溃', () => {
    const s = computeStats([reading('a', [{ cardId: 'nope', reversed: false, positionNo: 1 }])])
    expect(s.drawn).toBe(1)
    expect(s.topCards[0].nameZh).toBe('nope')
  })
})
