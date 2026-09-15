<script setup lang="ts">
// 根组件：氛围背景 + 路由出口 + 全局 toast 出口（04 §2 分层纪律：App 不含业务）
// 原生侧职责集中在此：系统栏配色、返回键语义、后台落盘、安全区重算、音频解锁
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { App } from '@capacitor/app'
import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import { useToastStore } from '@/stores/toast'
import Backdrop from '@/components/Backdrop.vue'
import { isNative } from '@/platform'
import { initBackHandler } from '@/platform/back'
import { flushStorage } from '@/platform/storage'
import { applyInsets } from '@/platform/insets'
import { unlockAudio } from '@/platform/sound'
import { isLegacyWebView } from '@/platform/device'

const toast = useToastStore()
const router = useRouter()

/* 流程页退出确认（09 Q10）：一次误触不该丢掉整次占卜 */
const exitAsk = ref(false)
let resolver: ((ok: boolean) => void) | null = null
function askExit(): Promise<boolean> {
  exitAsk.value = true
  return new Promise((r) => {
    resolver = r
  })
}
function answerExit(ok: boolean) {
  exitAsk.value = false
  resolver?.(ok)
  resolver = null
}

onMounted(() => {
  if (!isNative()) return
  // 深紫黑底 → 系统栏内容用亮色（SystemBarsStyle.Dark 语义：深色背景下的亮色内容）
  void SystemBars.setStyle({ style: SystemBarsStyle.Dark })
  // WebView 过旧只提示不阻断：表现是动效异常而非白屏（09 R3）
  if (isLegacyWebView()) {
    toast.show('系统 WebView 版本较旧，部分动效可能异常，建议更新 Android System WebView。', 6000)
  }
  initBackHandler(router, { confirm: askExit, toast: (m) => toast.show(m) })
  // 进入后台立即落盘：不依赖 400ms 防抖，防杀进程丢最后一次写入
  void App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) void flushStorage()
  })
  // 旋转 / 分屏后安全区会变
  window.addEventListener('resize', () => void applyInsets())
  // 首次指针事件解锁 AudioContext（自动播放策略；是否发声由 settings.sound 决定）
  window.addEventListener('pointerdown', () => void unlockAudio(), { once: true })
})
</script>

<template>
  <Backdrop />
  <div class="app-body">
    <router-view v-slot="{ Component }">
      <transition name="route" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
  <transition name="toast">
    <div v-if="toast.message" class="app-toast">{{ toast.message }}</div>
  </transition>

  <!-- 返回键退出确认（仅原生） -->
  <transition name="fade">
    <div v-if="exitAsk" class="exit-mask" @click.self="answerExit(false)">
      <div class="exit-card">
        <p class="exit-title">要放弃这次占卜吗？</p>
        <p class="exit-sub">退出后需要重新洗牌抽牌。</p>
        <div class="exit-acts">
          <button type="button" class="btn ghost" @click="answerExit(false)">继续占卜</button>
          <button type="button" class="btn solid" @click="answerExit(true)">放弃退出</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* 内容层压在氛围背景之上（Backdrop 为 fixed z-0） */
.app-body {
  position: relative;
  z-index: 1;
}
.app-toast {
  position: fixed;
  left: 50%;
  bottom: calc(18% + var(--safe-bottom));
  transform: translateX(-50%);
  max-width: 80vw;
  background: rgba(20, 16, 31, 0.92);
  border: 1px solid var(--gold-dim);
  border-radius: 999px;
  color: var(--text);
  font-size: 0.13rem;
  padding: 0.1rem 0.24rem;
  z-index: 99;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  text-align: center;
}
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, 8px);
}
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -4px);
}

.exit-mask {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgba(6, 5, 11, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.24rem;
}
.exit-card {
  width: 100%;
  max-width: 3rem;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 0.2rem 0.18rem 0.18rem;
  text-align: center;
}
.exit-title {
  font-family: var(--font-serif);
  font-size: 0.16rem;
  color: var(--gold-bright);
}
.exit-sub {
  font-size: 0.11rem;
  color: var(--text-3);
  margin-top: 0.06rem;
}
.exit-acts {
  display: flex;
  gap: 0.1rem;
  margin-top: 0.18rem;
}
.btn {
  flex: 1;
  font-size: 0.13rem;
  border-radius: 999px;
  padding: 0.1rem 0;
}
.btn.ghost {
  color: var(--text-2);
  border: 1px solid var(--line);
}
.btn.solid {
  color: #14101f;
  background: linear-gradient(160deg, var(--gold-bright), var(--gold));
}
</style>
