// 走查幕 1 集成测试（04 §8.2 的引擎级母版，UI 幕待 Playwright 期）：
// 「这段感情要不要继续」→ 感情域 → 三张阵 → 洗牌 → 切中摞 → 抽 3 张 → 组装 → 全结构就绪
import { beforeEach, describe, expect, it } from 'vitest'
import { cardMap, scenarios, spreadMap } from '@/data'
import { createDraw, resetRandomSource, setRandomSource, shuffleDeck } from '@/engine/shuffle'
import { composeReading } from '@/engine/interpreter'
import { cards } from '@/data'
import type { DrawnCard, Question } from '@/types'

function mulberry32(seed: number): (max: number) => number {
  let a = seed >>> 0
  return (max: number) => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) % max
  }
}

beforeEach(() => resetRandomSource())

describe('走查幕 1：感情三张阵全链', () => {
  it('场景识别 → 洗牌 → 切牌 → 抽 3 → 组装，输出完整可渲染', () => {
    // 1. 提问：问题文本命中场景注册表（与 AskView 相同的两段识别：questionPatterns → keywords）
    const raw = '这段感情要不要继续'
    const scenario =
      scenarios.find((s) => s.questionPatterns.some((p) => raw.includes(p) || p.includes(raw))) ??
      scenarios.find((s) => s.keywords.some((k) => raw.includes(k)))
    expect(scenario?.basedOn).toBe('love')
    const question: Question = {
      text: raw,
      domain: 'love',
      timeframeMonths: 3,
      scenarioId: scenario?.id,
    }
    expect(question.scenarioId).toBeTruthy()

    // 2. 选阵：感情域包含三张阵
    const spread = spreadMap.get('three-timeline')!
    expect(spread.domains).toContain('love')

    // 3. 洗牌（固定种子可复现）
    setRandomSource(mulberry32(20260904))
    const { deckSnapshot, orientation } = shuffleDeck(cards.map((c) => c.id))
    expect(deckSnapshot).toHaveLength(78)

    // 4. 切牌中摞 → 扇形点选 3 张（扇面下标 10, 40, 70 —— 左中右各一）
    const outcome = createDraw(deckSnapshot, orientation, 2)
    const fanPicks = [10, 40, 70]
    const drawn: DrawnCard[] = fanPicks.map((f, i) => ({ ...outcome.pickAt(f, true), positionNo: i + 1 }))
    expect(new Set(drawn.map((d) => d.cardId)).size).toBe(3)

    // 5. 组装：3 单牌段 + 2 关联段 + 四件套 + 收束语，全段落非空
    const r = composeReading({ question, spread, cards: drawn })
    expect(r.positions).toHaveLength(3)
    expect(r.positions.every((p) => p.text.length > 60)).toBe(true)
    expect(r.links).toHaveLength(2)
    expect(r.links.every((l) => l.text.length > 40 && l.label)).toBe(true)
    expect(r.summary.trendText.length).toBeGreaterThan(20)
    expect(r.summary.majorText.length).toBeGreaterThan(20)
    expect(r.summary.elementText.length).toBeGreaterThan(20)
    expect(r.summary.actions.length).toBeGreaterThanOrEqual(1)
    expect(r.closing).toBeTruthy()
    // 牌都是牌库里的
    expect(drawn.every((d) => cardMap.has(d.cardId))).toBe(true)

    // 6. 快照落库结构（historyStore.save 的输入）自洽
    const snapshot = {
      id: 'w1', createdAt: new Date().toISOString(), question, spreadId: spread.id,
      cards: drawn, deckSnapshot, cutIndex: 2 as const, interpretation: r,
    }
    expect(snapshot.interpretation).toBe(r) // 引用即快照，不随牌义库改写
  })
})
