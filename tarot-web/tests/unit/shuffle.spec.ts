// 洗牌引擎单测（04 §8.1）：均匀性卡方 / 位相独立 / 切牌偏移 / 逆位开关
import { afterEach, describe, expect, it } from 'vitest'
import { cards } from '@/data'
import { CUT_OFFSET, createDraw, resetRandomSource, setRandomSource, shuffleDeck } from '@/engine/shuffle'

const IDS = cards.map((c) => c.id)

/** mulberry32：可复现的均匀伪随机源（测试注入用） */
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

afterEach(() => resetRandomSource())

describe('shuffleDeck', () => {
  it('是 78 张牌的全量排列（无缺失、无重复）', () => {
    setRandomSource(mulberry32(42))
    const { deckSnapshot } = shuffleDeck(IDS)
    expect(deckSnapshot).toHaveLength(78)
    expect(new Set(deckSnapshot).size).toBe(78)
    expect(IDS.every((id) => deckSnapshot.includes(id))).toBe(true)
  })

  it('同种子确定性复现；不同种子排列不同', () => {
    setRandomSource(mulberry32(7))
    const a = shuffleDeck(IDS).deckSnapshot
    setRandomSource(mulberry32(7))
    const b = shuffleDeck(IDS).deckSnapshot
    setRandomSource(mulberry32(8))
    const c = shuffleDeck(IDS).deckSnapshot
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })

  it('均匀性：500 次洗牌，每个位次对 78 张牌的分布卡方 < 120（df=77，p>0.01 余量）', () => {
    const seedFn = mulberry32(2026)
    setRandomSource(seedFn)
    const N = 500
    // counts[pos][cardIdx]
    const counts: number[][] = Array.from({ length: 78 }, () => new Array<number>(78).fill(0))
    for (let t = 0; t < N; t++) {
      const { deckSnapshot } = shuffleDeck(IDS)
      deckSnapshot.forEach((id, pos) => counts[pos][IDS.indexOf(id)]++)
    }
    const exp = N / 78
    let maxChi2 = 0
    let sumChi2 = 0
    for (let pos = 0; pos < 78; pos++) {
      const chi2 = counts[pos].reduce((s, o) => s + ((o - exp) ** 2) / exp, 0)
      maxChi2 = Math.max(maxChi2, chi2)
      sumChi2 += chi2
    }
    // χ²₇₇：均值 77、σ≈12.4；78 个位次取最大值阈值 120（~3.5σ），均值落在 [50,105]
    expect(maxChi2).toBeLessThan(120)
    expect(sumChi2 / 78).toBeGreaterThan(50)
    expect(sumChi2 / 78).toBeLessThan(105)
  })

  it('位相：逆位率 ≈ 50%，且洗牌与位相使用同一随机流互不干扰', () => {
    setRandomSource(mulberry32(999))
    let rev = 0
    const N = 500
    for (let t = 0; t < N; t++) {
      const { orientation } = shuffleDeck(IDS)
      rev += orientation.filter(Boolean).length
    }
    const rate = rev / (N * 78)
    expect(rate).toBeGreaterThan(0.485)
    expect(rate).toBeLessThan(0.515)
  })
})

describe('createDraw', () => {
  const deck = [...IDS]
  const orientation = deck.map(() => false)

  it('切牌偏移：cutIndex=1 从头取；cutIndex=2 偏移 26；cutIndex=3 偏移 52 并环形回绕', () => {
    const d1 = createDraw(deck, orientation, 1).draw(3)
    expect(d1.map((c) => c.cardId)).toEqual(deck.slice(0, 3))
    const d2 = createDraw(deck, orientation, 2).draw(3)
    expect(d2.map((c) => c.cardId)).toEqual(deck.slice(CUT_OFFSET, CUT_OFFSET + 3))
    const d3 = createDraw(deck, orientation, 3).draw(5)
    expect(d3.map((c) => c.cardId)).toEqual([...deck.slice(52), ...deck.slice(0, 2)].slice(0, 5))
  })

  it('draw 输出带位相与位置序号；逆位开关关闭时全正位（不重洗）', () => {
    const orient = deck.map((_, i) => i % 2 === 0)
    const outcome = createDraw(deck, orient, 1)
    const on = outcome.draw(4, true)
    expect(on.map((c) => c.reversed)).toEqual([true, false, true, false])
    expect(on.map((c) => c.positionNo)).toEqual([1, 2, 3, 4])
    const off = outcome.draw(4, false)
    expect(off.every((c) => !c.reversed)).toBe(true)
  })
})
