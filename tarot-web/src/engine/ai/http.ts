// 平台 HTTP 适配（11 §5.3）
//
// ⚠️ 实测更正（2026-09-13，与规划时的假设不同）：
//   规划原定用 `@capacitor/http` 在原生侧绕过 WebView 的 CORS，但该包在 Capacitor 8 时代
//   只有一个 **0.0.2 空壳版本**（无 CapacitorHttp 导出、ESM 产物都不完整），社区版
//   @capacitor-community/http 停留在 1.4.1（面向 Capacitor 4/5）。因此 v1 统一走 fetch，
//   CORS 风险如实暴露给用户（错误码 'cors'，见 rituals.ai.err.cors）。
//
// 这个文件的存在意义就是**保留接缝**：将来若有可用的原生 HTTP 通道（官方插件恢复发布 /
// 自研插件 / 服务端代理），只改这里，client.ts 与上层零改动。
export interface HttpResponse {
  status: number
  data: unknown
}

export interface PostOptions {
  url: string
  headers: Record<string, string>
  body: unknown
  /** 超时（毫秒）：统一用 AbortController 实现 */
  timeoutMs: number
}

export async function postJson(o: PostOptions): Promise<HttpResponse> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), o.timeoutMs)
  try {
    const r = await fetch(o.url, {
      method: 'POST',
      headers: o.headers,
      body: JSON.stringify(o.body),
      signal: ctrl.signal,
    })
    let data: unknown = null
    try {
      data = await r.json()
    } catch {
      data = null // 非 JSON 响应交给上层判为 parse 错误
    }
    return { status: r.status, data }
  } finally {
    clearTimeout(timer)
  }
}
