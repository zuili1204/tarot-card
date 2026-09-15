import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useDailyStore } from './daily'
import { storageGet, storageSet } from '@/platform/storage'

const KEY = 'tarot.tasks.v1'

interface TasksState {
  viewedCards: string[]
  sawDrawTips: boolean
  unlockedAdvanced: boolean
  threeCardDone: boolean
  finishedAt: string | null
}

function load(): TasksState {
  try {
    const raw = storageGet(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        viewedCards: Array.isArray(p.viewedCards) ? p.viewedCards : [],
        sawDrawTips: Boolean(p.sawDrawTips),
        unlockedAdvanced: Boolean(p.unlockedAdvanced),
        threeCardDone: Boolean(p.threeCardDone),
        finishedAt: p.finishedAt ?? null,
      }
    }
  } catch {
    /* 损坏回落 */
  }
  return { viewedCards: [], sawDrawTips: false, unlockedAdvanced: false, threeCardDone: false, finishedAt: null }
}

// 新手任务进度（07 §2）：M1 先落"查词典"记录，任务条 UI M3 上
export const useTaskStore = defineStore('tasks', () => {
  const loaded = load()
  const viewedCards = ref<string[]>(loaded.viewedCards)
  const sawDrawTips = ref(loaded.sawDrawTips)
  const unlockedAdvanced = ref(loaded.unlockedAdvanced)
  const threeCardDone = ref(loaded.threeCardDone)
  const finishedAt = ref<string | null>(loaded.finishedAt)

  function persist() {
    storageSet(
      KEY,
      JSON.stringify({
        viewedCards: viewedCards.value,
        sawDrawTips: sawDrawTips.value,
        unlockedAdvanced: unlockedAdvanced.value,
        threeCardDone: threeCardDone.value,
        finishedAt: finishedAt.value,
      }),
    )
  }

  // 词典详情页 onMounted 调用：去重追加（07 §2 任务 3 判定依据）
  function recordViewed(cardId: string) {
    if (!viewedCards.value.includes(cardId)) {
      viewedCards.value.push(cardId)
      persist()
      checkUnlock()
    }
  }

  // 完成一次三张阵占卜（07 §2 任务 2）
  function recordThreeCardReading() {
    threeCardDone.value = true
    persist()
    checkUnlock()
  }

  // 每日一抽落库后调用（07 §2 任务 1：判定=tarot.daily.v1 出现首条记录）
  function recordDailyDraw() {
    checkUnlock()
  }

  // 解锁判定（07 §2）：三步全齐——每日一抽有记录 + 三张阵一次 + 词典看满 3 张
  function checkUnlock() {
    const dailyDone = Object.keys(useDailyStore().entries).length > 0
    if (!unlockedAdvanced.value && dailyDone && threeCardDone.value && viewedCards.value.length >= 3) {
      unlockedAdvanced.value = true
      finishedAt.value = new Date().toISOString()
      persist()
    }
  }

  // 抽牌页首次三步提示已看（07 §1.3）
  function markTipsSeen() {
    sawDrawTips.value = true
    persist()
  }

  return {
    viewedCards, sawDrawTips, unlockedAdvanced, finishedAt, threeCardDone,
    recordViewed, recordThreeCardReading, recordDailyDraw, checkUnlock, markTipsSeen,
  }
})
