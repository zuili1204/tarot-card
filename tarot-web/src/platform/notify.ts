// Hindsight 回顾提醒（03 §4.3 / 09 N4）：保存占卜 N 天后提醒回来对照现实。
// 设计取舍：
//   1. 默认关闭，且随时可关——提醒是这个品类最容易变成骚扰的地方，
//      宁可少做，也不做"关不掉的通知"（03 §6.3 品类信誉教训）。
//   2. 非精确闹钟（allowWhileIdle=false、用 at 但不声明精确）：Android 12+ 的
//      SCHEDULE_EXACT_ALARM 属于特殊权限，普通应用默认没有，强行依赖会静默失效。
//   3. 权限被拒不打扰用户第二次：只在开关打开时请求一次。
import { LocalNotifications } from '@capacitor/local-notifications'
import { isNative } from './index'

const HINDSIGHT_DAYS = 3

/** 请求通知权限（仅首次开启时调用；被拒后不再弹） */
export async function ensureNotifyPermission(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const cur = await LocalNotifications.checkPermissions()
    if (cur.display === 'granted') return true
    const req = await LocalNotifications.requestPermissions()
    return req.display === 'granted'
  } catch {
    return false
  }
}

/**
 * 调度一次回顾提醒。id 用占卜 id 的哈希，保证重复保存同一条不会排两次。
 * 失败静默：提醒是锦上添花，不能因为通知失败影响保存流程。
 */
export async function scheduleHindsight(readingId: string, spreadName: string): Promise<void> {
  if (!isNative()) return
  try {
    const ok = await ensureNotifyPermission()
    if (!ok) return
    await LocalNotifications.schedule({
      notifications: [
        {
          id: hashId(readingId),
          title: '三天前，你问过牌',
          body: `那次「${spreadName}」的解读，现在回头看对上了几分？`,
          schedule: { at: new Date(Date.now() + HINDSIGHT_DAYS * 86400000) },
          sound: undefined,
          extra: { readingId },
        },
      ],
    })
  } catch {
    /* 静默：不影响主流程 */
  }
}

/** 关闭开关/删除记录时取消对应提醒 */
export async function cancelHindsight(readingId: string): Promise<void> {
  if (!isNative()) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: hashId(readingId) }] })
  } catch {
    /* 同上 */
  }
}

/** 字符串 → 稳定的正整数 id（通知 id 上限 int） */
function hashId(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h % 2147483647)
}
