import { isNative } from './index'

/**
 * 低端机判定（M2 降级依据）：CPU 核心数 ≤4 或内存 ≤3GB。
 * 目标是"帧率优先于氛围"——关掉持续动画层、缩短仪式链时长，而不是砍功能。
 */
export function isLowEndDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 8
  const mem = nav.deviceMemory ?? 8
  return cores <= 4 || mem <= 3
}

/** 从 UA 解析 Chromium 版本（Android WebView 与 Chrome 同源） */
export function webViewMajorVersion(): number {
  const m = navigator.userAgent.match(/Chrome\/(\d+)/)
  return m ? Number(m[1]) : 0
}

/**
 * WebView 过旧（<70）：不支持 WAAPI 与现代语法（04 §5 的 FLIP 飞行依赖 WAAPI）。
 * 表现是动效异常而非白屏，故只提示、不阻断（09 R3）。
 */
export function isLegacyWebView(): boolean {
  if (!isNative()) return false
  const v = webViewMajorVersion()
  return v > 0 && v < 70
}
