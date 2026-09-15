import { defineStore } from 'pinia'
import { ref } from 'vue'

// 全局轻提示（M3）：底部浮层，自动消隐；只做一句话级别反馈
export const useToastStore = defineStore('toast', () => {
  const message = ref('')
  let timer: ReturnType<typeof setTimeout> | null = null

  function show(text: string, ms = 2400) {
    message.value = text
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      message.value = ''
      timer = null
    }, ms)
  }

  return { message, show }
})
