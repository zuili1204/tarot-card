// 安全区（09 R5）：targetSdk 36 起 Android 强制 edge-to-edge，
// WebView 内容会延伸到状态栏与导航栏之下，必须拿到真实 insets 再给 CSS 变量。
// 数值来自自研 InsetsPlugin（WindowInsetsCompat），单位 dp ≈ CSS px。
import { registerPlugin } from '@capacitor/core'
import { isNative } from './index'

interface InsetsPlugin {
  get(): Promise<{ top: number; bottom: number }>
}

const Insets = registerPlugin<InsetsPlugin>('Insets')

/** 把系统栏/刘海 insets 写入 --safe-top / --safe-bottom（web 端保持 env() 兜底不变） */
export async function applyInsets(): Promise<void> {
  if (!isNative()) return
  try {
    const { top, bottom } = await Insets.get()
    const root = document.documentElement
    root.style.setProperty('--safe-top', `${Math.round(top)}px`)
    root.style.setProperty('--safe-bottom', `${Math.round(bottom)}px`)
  } catch {
    /* 取不到就保持 tokens.css 里的 env(safe-area-inset-*) 兜底 */
  }
}
