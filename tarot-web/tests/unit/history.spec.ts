// 快照不回写单测（04 §8.1）：落库后修改牌义库对象，历史文本不变
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { cardMap } from '@/data'
import { useHistoryStore } from '@/stores/history'
import type { ReadingSnapshot } from '@/types'

// node 环境无 localStorage：最小桩
const store: Record<string, string> = {}
;(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v
  },
  removeItem: (k: string) => delete store[k],
}

function fakeReading(): ReadingSnapshot {
  return {
    id: 'r-test-1',
    createdAt: '2026-09-04T12:00:00.000Z',
    question: { text: '这段感情要不要继续', domain: 'love', timeframeMonths: 3, scenarioId: 'breakup' },
    spreadId: 'three-timeline',
    cards: [{ cardId: 'major-0', reversed: false, positionNo: 1 }],
    deckSnapshot: ['major-0'],
    cutIndex: 1,
    interpretation: {
      intro: '快照文本',
      positions: [{ positionNo: 1, positionName: '过去', cardId: 'major-0', reversed: false, variant: 'neutral', text: '愚人：原始文案' }],
      links: [],
      summary: { trendLabel: '', trendText: '', majorText: '', elementText: '', actionLead: '', actions: [] },
      closing: null,
    },
  }
}

describe('historyStore 快照', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    for (const k of Object.keys(store)) delete store[k]
  })

  it('落库后修改 cards 数据源，历史解读文本不变', () => {
    const h = useHistoryStore()
    const reading = fakeReading()
    h.save(reading)

    // 模拟牌义库更新：改内存中的 cardMap 条目
    const card = cardMap.get('major-0')!
    const original = card.core.up
    card.core.up = '被改写后的新牌义'

    const saved = h.get('r-test-1')!
    expect(saved.interpretation.positions[0].text).toBe('愚人：原始文案')
    expect(saved.interpretation.intro).toBe('快照文本')

    card.core.up = original // 还原，避免影响其它用例
  })

  it('超 200 条 FIFO 截断，最新置顶', () => {
    const h = useHistoryStore()
    for (let i = 0; i < 205; i++) {
      h.save({ ...fakeReading(), id: `r-${i}` })
    }
    expect(h.count).toBe(200)
    expect(h.readings[0].id).toBe('r-204')
    expect(h.get('r-0')).toBeUndefined()
    expect(h.get('r-4')).toBeUndefined() // 逐出 r-0..r-4 共 5 条
    expect(h.get('r-5')).toBeDefined()
  })
})
