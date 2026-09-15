import { defineStore } from 'pinia'
import { ref } from 'vue'
import { storageGet, storageSet } from '@/platform/storage'

// 每日一抽（05 §5.2）：tarot.daily.v1，按日期键，最多保留 366 天（M3 接 UI，M2 先落数据层）
const KEY = 'tarot.daily.v1'
const CAP_DAYS = 366

export interface DailyEntry {
  cardId: string
  reversed: boolean
  note?: string
}

type DailyMap = Record<string, DailyEntry> // key = YYYY-MM-DD（本地时区）

function load(): DailyMap {
  try {
    const raw = storageGet(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (p?.days && typeof p.days === 'object') return p.days
    }
  } catch {
    /* 损坏回落空 */
  }
  return {}
}

function localDate(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const useDailyStore = defineStore('daily', () => {
  const entries = ref<DailyMap>(load())

  function persist() {
    // 366 天窗口：按 key 排序只留最近 CAP_DAYS 条
    const keys = Object.keys(entries.value).sort()
    while (keys.length > CAP_DAYS) {
      delete entries.value[keys.shift() as string]
    }
    storageSet(KEY, JSON.stringify({ version: 1, days: entries.value }))
  }

  function today(): DailyEntry | null {
    return entries.value[localDate()] ?? null
  }

  function saveToday(entry: DailyEntry) {
    entries.value[localDate()] = entry
    persist()
  }

  function recentDays(n: number): { date: string; entry: DailyEntry }[] {
    return Object.keys(entries.value)
      .sort()
      .slice(-n)
      .map((date) => ({ date, entry: entries.value[date] }))
  }

  return { entries, today, saveToday, recentDays }
})
