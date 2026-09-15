import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { storageGet, storageSet } from '@/platform/storage'

const KEY = 'tarot.settings.v1'

interface SettingsState {
  reversed: boolean
  sound: boolean
  /** 回顾提醒（Hindsight，03 §4.3 / 09 N4）：默认关，避免变成骚扰 */
  hindsight: boolean
  deckId: string
}

function load(): SettingsState {
  // 音效默认关（05 §6.2：环境音默认不打扰；P1 提供后由用户自行开启）
  const defaults: SettingsState = { reversed: true, sound: false, hindsight: false, deckId: 'rws-1909' }
  try {
    const raw = storageGet(KEY)
    if (raw) return { ...defaults, ...JSON.parse(raw) }
  } catch {
    /* 损坏则回落默认 */
  }
  return defaults
}

// 设置项（05 §5.2）：逆位开关 / 音效 / 牌组
export const useSettingsStore = defineStore('settings', () => {
  const state = ref<SettingsState>(load())

  watch(
    state,
    (v) => storageSet(KEY, JSON.stringify(v)),
    { deep: true },
  )

  return { state }
})
