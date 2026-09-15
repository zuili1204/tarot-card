// 诊断日志（09 N5-3）：全局捕获未处理异常与 Promise 拒绝，滚动保留最近 200 行，
// 供设置页导出。自用阶段没有崩溃上报 SDK，这是唯一的可观测手段——
// 真机出问题却拿不到任何信息，是之前最难排查的一类问题。
// 纪律：只在本地内存与用户主动导出的文件里，不上传、不落第三方。
import { isNative } from './index'

const MAX = 200
const lines: string[] = []

function push(level: 'ERROR' | 'WARN' | 'INFO', msg: string): void {
  lines.push(`[${new Date().toISOString()}] ${level} ${msg}`)
  if (lines.length > MAX) lines.shift()
}

export function logError(msg: string): void {
  push('ERROR', msg)
}
export function logWarn(msg: string): void {
  push('WARN', msg)
}
export function logInfo(msg: string): void {
  push('INFO', msg)
}

/** 在应用启动前安装：越早捕获越多（main.ts 里第一件事调用） */
export function installGlobalHandlers(): void {
  window.addEventListener('error', (e) => {
    push('ERROR', `error: ${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`)
  })
  window.addEventListener('unhandledrejection', (e) => {
    const reason = (e as PromiseRejectionEvent).reason
    push('ERROR', `unhandledrejection: ${reason instanceof Error ? reason.stack ?? reason.message : String(reason)}`)
  })
  push('INFO', `boot platform=${isNative() ? 'native' : 'web'}`)
  push('INFO', `ua=${navigator.userAgent}`)
}

/** 导出为纯文本（设置页「导出诊断日志」用） */
export function dumpLog(): string {
  return lines.join('\n')
}
