// 分享与导出（09 Q6 决议：走系统分享面板，零权限）
//   native → 写 Cache 目录 + @capacitor/share 调起系统面板（FileProvider 已由 Capacitor 配置）
//   web    → 退化为浏览器下载
// 不申请 WRITE_EXTERNAL_STORAGE / 不直存相册：省掉权限与分区存储适配，用户可自行存相册
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNative } from './index'

/** 分享 PNG（dataURL → 文件 → 系统面板） */
export async function shareImage(dataUrl: string, fileName: string): Promise<boolean> {
  if (!isNative()) {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = fileName
    a.click()
    return true
  }
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const path = `share/${fileName}`
  try {
    await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache })
    const uri = await Filesystem.getUri({ path, directory: Directory.Cache })
    await Share.share({ files: [uri.uri], title: fileName })
    return true
  } catch {
    return false
  }
}

export interface ShareResult {
  ok: boolean
  /** 失败原因（原生侧的真实异常），用于提示而不是让用户干瞪眼重试 */
  error?: string
}

/** 导出文本（JSON 备份 / 诊断日志）：native 走系统面板，web 走下载 */
export async function shareText(text: string, fileName: string): Promise<ShareResult> {
  if (!isNative()) {
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    return { ok: true }
  }
  const path = `export/${fileName}`
  try {
    await Filesystem.writeFile({
      path,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    const uri = await Filesystem.getUri({ path, directory: Directory.Cache })
    try {
      await Share.share({ files: [uri.uri], title: fileName })
      return { ok: true }
    } catch (e) {
      // 兜底：部分 ROM 对单文件分享支持不好（或被接收方拒绝），退回纯文本分享
      try {
        await Share.share({ title: fileName, text })
        return { ok: true }
      } catch (e2) {
        return { ok: false, error: describe(e) || describe(e2) }
      }
    }
  } catch (e) {
    return { ok: false, error: describe(e) }
  }
}

function describe(e: unknown): string {
  if (e instanceof Error) return e.message
  const m = (e as { message?: string } | null)?.message
  return m ?? String(e)
}
