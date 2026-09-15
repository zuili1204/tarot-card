// 回归保护（10 §14.1）：老记录可打开 / 子情境只换开场收束不换牌义 / 统计页新增域显示正常
import { describe, expect, it } from 'vitest'
import { scenarioMap, spreadMap, subScenarioMap } from '@/data'
import { composeReading } from '@/engine/interpreter'
import { computeStats } from '@/engine/stats'
import type { DrawnCard, DomainKey, Question, ReadingSnapshot } from '@/types'

const spread = spreadMap.get('three-timeline')!

const drawn: DrawnCard[] = [
  { cardId: 'major-0', reversed: false, positionNo: 1 },
  { cardId: 'cups-3', reversed: true, positionNo: 2 },
  { cardId: 'swords-10', reversed: false, positionNo: 3 },
]

const base: Question = {
  text: '异地恋要不要继续',
  domain: 'love',
  timeframeMonths: 3,
  scenarioId: 'long-distance',
}

const EMPTY_INTERPRETATION = {
  intro: '',
  positions: [],
  links: [],
  summary: { trendLabel: '', trendText: '', majorText: '', elementText: '', actionLead: '', actions: [] },
  closing: null,
}

describe('子情境（10 §5.2）：只换开场与收束，牌义沿用父场景', () => {
  const sub = subScenarioMap.get('ld-abroad')!
  const withSub = composeReading({ question: { ...base, subScenarioId: 'ld-abroad' }, spread, cards: drawn })
  const noSub = composeReading({ question: base, spread, cards: drawn })

  it('开场与收束取子情境的', () => {
    expect(withSub.intro).toBe(sub.intro)
    expect(withSub.closing).toBe(sub.closing)
    expect(noSub.closing).not.toBe(sub.closing) // 不选子情境时回到场景收束语
  })

  it('单牌段正文不受子情境影响（子情境无牌义）', () => {
    expect(withSub.positions.map((p) => p.text)).toEqual(noSub.positions.map((p) => p.text))
  })
})

describe('老记录兼容（05 §5.2 快照不回写）', () => {
  it('无 scenarioId / subScenarioId 的老快照可正常组装，开场回落通用', () => {
    const r = composeReading({
      question: { text: '最近怎么样', domain: 'general', timeframeMonths: 3 },
      spread,
      cards: drawn,
    })
    expect(r.intro.length).toBeGreaterThan(0)
    expect(r.closing).toBeNull()
    expect(r.positions).toHaveLength(3)
  })

  it('场景 id 失效时不崩，按域牌义降级', () => {
    expect(scenarioMap.get('not-exist')).toBeUndefined()
    const r = composeReading({ question: { ...base, scenarioId: 'not-exist' }, spread, cards: drawn })
    expect(r.positions[0].text.length).toBeGreaterThan(0)
  })
})

describe('统计页新增域（10 §13）', () => {
  const DOMAINS: DomainKey[] = [
    'love', 'career', 'wealth', 'study', 'family',
    'social', 'growth', 'wellbeing', 'place', 'create', 'general',
  ]

  it('11 个域都输出中文名，不回退成 key 原文', () => {
    const list: ReadingSnapshot[] = DOMAINS.map((d, i) => ({
      id: `r${i}`,
      createdAt: `2026-09-0${(i % 9) + 1}T12:00:00.000Z`,
      question: { text: '测试', domain: d, timeframeMonths: 3 },
      spreadId: 'three-timeline',
      cards: [{ cardId: 'major-0', reversed: false, positionNo: 1 }],
      deckSnapshot: ['major-0'],
      cutIndex: 1,
      interpretation: EMPTY_INTERPRETATION,
    }))
    const s = computeStats(list)
    expect(s.domainDist).toHaveLength(DOMAINS.length)
    for (const d of s.domainDist) {
      expect(d.nameZh).not.toBe(d.key)
      expect(d.nameZh.length).toBeGreaterThan(0)
    }
  })
})
