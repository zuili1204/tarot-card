import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { AiConfig } from '@/types'
import { AI_DEFAULTS, loadAiConfig, saveAiConfig } from '@/platform/aiStore'

// AI 配置（11 §7.2）：独立 key tarot.ai.v1，不并入 settings（避免随备份导出密钥）
export const useAiStore = defineStore('ai', () => {
  const state = ref<AiConfig>(loadAiConfig())

  watch(state, (v) => saveAiConfig(v), { deep: true })

  /** 切换服务商：带出该预设的地址与模型（用户已改过的不强制覆盖） */
  function applyPreset(baseUrl: string, model: string) {
    state.value.baseUrl = baseUrl
    state.value.model = model
    // 换服务商 = 换数据接收方，知情确认作废（11 §3.3）
    state.value.confirmedAt = undefined
    state.value.lastTest = undefined
  }

  function clear() {
    state.value = { ...AI_DEFAULTS }
  }

  return { state, applyPreset, clear }
})
