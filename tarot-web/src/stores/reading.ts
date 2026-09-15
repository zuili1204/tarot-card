import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { DrawnCard, Question, ReadingInterpretation } from '@/types'

// 进行中占卜（04 §3）：Pinia + sessionStorage 双保险——
// 只持久化 question/spreadId（洗牌未完成前）；刷新回到洗牌重抽，不静默重放。
const KEY = 'tarot.reading.progress.v1'

interface Progress {
  question: Question
  spreadId: string
}

function loadProgress(): Progress | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (p?.question?.text && p?.spreadId) return p
    }
  } catch {
    /* 损坏回落 */
  }
  return null
}

export const useReadingStore = defineStore('reading', () => {
  const question = ref<Question | null>(loadProgress()?.question ?? null)
  const spreadId = ref<string | null>(loadProgress()?.spreadId ?? null)

  // 以下仅内存：洗牌产物与解读快照（刷新即弃，防回放）
  const cutIndex = ref<1 | 2 | 3 | null>(null)
  const deckSnapshot = ref<string[] | null>(null)
  const orientation = ref<boolean[] | null>(null)
  const drawnCards = ref<DrawnCard[] | null>(null)
  const interpretation = ref<ReadingInterpretation | null>(null)

  watch(
    [question, spreadId],
    ([q, s]) => {
      if (q && s) sessionStorage.setItem(KEY, JSON.stringify({ question: q, spreadId: s } satisfies Progress))
      else sessionStorage.removeItem(KEY)
    },
    { deep: true },
  )

  function setQuestion(q: Question) {
    question.value = q
  }

  function setSpread(id: string) {
    spreadId.value = id
  }

  /** 松手洗牌完成：固化排列与位相 */
  function setShuffleResult(deck: string[], orient: boolean[]) {
    deckSnapshot.value = deck
    orientation.value = orient
  }

  function setCut(cut: 1 | 2 | 3) {
    cutIndex.value = cut
  }

  function setDrawn(cards: DrawnCard[]) {
    drawnCards.value = cards
  }

  function setInterpretation(r: ReadingInterpretation) {
    interpretation.value = r
  }

  /** 保存进历史或放弃后清场（question/spreadId 一并清，回到新占卜起点） */
  function reset() {
    question.value = null
    spreadId.value = null
    cutIndex.value = null
    deckSnapshot.value = null
    orientation.value = null
    drawnCards.value = null
    interpretation.value = null
  }

  return {
    question, spreadId, cutIndex, deckSnapshot, orientation, drawnCards, interpretation,
    setQuestion, setSpread, setShuffleResult, setCut, setDrawn, setInterpretation, reset,
  }
})
