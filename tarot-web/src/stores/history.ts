import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AiInterpretation, ReadingSnapshot } from '@/types'
import { storageGet, storageSet } from '@/platform/storage'

// 历史记录（05 §5.2）：tarot.readings.v1，上限 200 条，FIFO 截断；
// 快照不回写——解读文本是保存当时的产物，不随牌义库更新改写。
// Android 下这份 JSON 会整体落到 filesDir/readings.json（09 Q3），与导出文件格式同源。
const KEY = 'tarot.readings.v1'
const CAP = 200

function load(): ReadingSnapshot[] {
  try {
    const raw = storageGet(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (Array.isArray(p.readings)) return p.readings
    }
  } catch {
    /* 损坏回落空 */
  }
  return []
}

export const useHistoryStore = defineStore('history', () => {
  const readings = ref<ReadingSnapshot[]>(load())

  function persist() {
    storageSet(KEY, JSON.stringify({ version: 1, readings: readings.value }))
  }

  const count = computed(() => readings.value.length)

  function get(id: string): ReadingSnapshot | undefined {
    return readings.value.find((r) => r.id === id)
  }

  /** 新纪录置顶；超上限截尾 */
  function save(reading: ReadingSnapshot): string {
    readings.value = [reading, ...readings.value].slice(0, CAP)
    persist()
    return reading.id
  }

  function remove(id: string) {
    readings.value = readings.value.filter((r) => r.id !== id)
    persist()
  }

  /** 写入/覆盖 AI 深度解读（11 §7.1）：只动 ai 段，静态解读逐字不动 */
  function setAi(id: string, ai: AiInterpretation) {
    const r = readings.value.find((x) => x.id === id)
    if (!r) return
    r.ai = ai
    persist()
  }

  /** 导入（设置页）：按 id 去重合并，返回新增条数；结构不合格的条目丢弃 */
  function importReadings(list: unknown): number {
    if (!Array.isArray(list)) return 0
    const valid = list.filter(
      (r): r is ReadingSnapshot =>
        !!r && typeof r === 'object' && 'id' in r && 'question' in r && 'spreadId' in r && 'cards' in r && 'interpretation' in r,
    )
    const seen = new Set(readings.value.map((r) => r.id))
    const fresh = valid.filter((r) => !seen.has(r.id))
    if (fresh.length) {
      readings.value = [...fresh, ...readings.value].slice(0, CAP)
      persist()
    }
    return fresh.length
  }

  return { readings, count, get, save, remove, setAi, importReadings }
})
