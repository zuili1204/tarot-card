// 洗牌引擎（04 §4.1 / 07 §3「可验证的诚实随机」）
// Fisher-Yates 全量均匀洗牌 + 洗牌瞬间固化排列与位相；切牌只改读取偏移，不重洗。
import type { DrawnCard } from '@/types'

/** 均匀整数随机源：返回 [0, maxExclusive) */
export type RandomSource = (maxExclusive: number) => number

let source: RandomSource = cryptoRandom

/** 单测注入固定种子；生产不调用（直接用 crypto） */
export function setRandomSource(fn: RandomSource): void {
  source = fn
}

export function resetRandomSource(): void {
  source = cryptoRandom
}

/** 操作系统加密级熵源 + 拒绝采样（无模偏差） */
function cryptoRandom(maxExclusive: number): number {
  const range = 0x100000000
  const limit = Math.floor(range / maxExclusive) * maxExclusive
  const buf = new Uint32Array(1)
  let v: number
  do {
    globalThis.crypto.getRandomValues(buf)
    v = buf[0]
  } while (v >= limit)
  return v % maxExclusive
}

export interface ShuffledDeck {
  /** Fisher-Yates 全量随机排列（洗牌瞬间固化，随解读落库可回看核验） */
  deckSnapshot: string[]
  /** 每张牌预置位相（true=逆位），洗牌时同步生成，索引同 deckSnapshot */
  orientation: boolean[]
}

export function shuffleDeck(cardIds: readonly string[]): ShuffledDeck {
  const ids = [...cardIds]
  for (let i = ids.length - 1; i > 0; i--) {
    const j = source(i + 1)
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  const orientation = ids.map(() => source(2) === 1)
  return { deckSnapshot: ids, orientation }
}

export interface DrawOutcome {
  deckSnapshot: string[]
  orientation: boolean[]
  cutIndex: 1 | 2 | 3
  /** 从 (deck + offset) 头部取 n 张（环形回绕），带出位相；逆位开关在输出层生效，不重洗 */
  draw(n: number, allowReversed?: boolean): DrawnCard[]
  /** 扇形抽牌：点选扇面上第 fanIndex 张牌背（0-77），返回该位的牌与位相（位置序号由调用方按点选顺序赋） */
  pickAt(fanIndex: number, allowReversed?: boolean): { cardId: string; reversed: boolean }
}

export const CUT_OFFSET = 26

export function createDraw(deckSnapshot: string[], orientation: boolean[], cutIndex: 1 | 2 | 3): DrawOutcome {
  const offset = (cutIndex - 1) * CUT_OFFSET
  const total = deckSnapshot.length
  return {
    deckSnapshot,
    orientation,
    cutIndex,
    draw(n, allowReversed = true) {
      const out: DrawnCard[] = []
      for (let i = 0; i < n && i < total; i++) {
        const idx = (offset + i) % total
        out.push({
          cardId: deckSnapshot[idx],
          reversed: allowReversed && orientation[idx],
          positionNo: i + 1,
        })
      }
      return out
    },
    pickAt(fanIndex, allowReversed = true) {
      const idx = (offset + ((fanIndex % total) + total)) % total
      return { cardId: deckSnapshot[idx], reversed: allowReversed && orientation[idx] }
    },
  }
}
