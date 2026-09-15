// 返回键语义（09 Q10 必做项）：
//   流程页（ask/spread/draw）→ 确认后才退出，避免一次误触丢掉整次占卜（04 §3）
//   根页 → 2 秒内双击退出
//   其它页 → 正常回退；无历史则回首页
import { App } from '@capacitor/app'
import type { Router } from 'vue-router'
import { isNative } from './index'

const FLOW_PATHS = ['/draw', '/ask', '/spread']
const DOUBLE_TAP_MS = 2000

export interface BackHandlerOptions {
  /** 流程页退出前的确认；返回 true 表示用户确认放弃 */
  confirm: () => Promise<boolean>
  toast: (message: string) => void
}

export function initBackHandler(router: Router, opts: BackHandlerOptions): void {
  if (!isNative()) return

  let lastRootBack = 0

  void App.addListener('backButton', async ({ canGoBack }) => {
    const path = router.currentRoute.value.path

    if (FLOW_PATHS.some((p) => path.startsWith(p))) {
      const ok = await opts.confirm()
      if (!ok) return
      if (canGoBack) router.back()
      else await router.replace('/')
      return
    }

    if (path === '/' || path.startsWith('/onboarding')) {
      const now = Date.now()
      if (now - lastRootBack < DOUBLE_TAP_MS) {
        await App.exitApp()
        return
      }
      lastRootBack = now
      opts.toast('再按一次退出')
      return
    }

    if (canGoBack) router.back()
    else await router.replace('/')
  })
}
