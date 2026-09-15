// 存储适配层（09 §2 / Q3 决议）
//   web    → localStorage 同步读写，行为与现状完全一致
//   native → 启动时 hydrate 到内存镜像；读写走镜像（保持同步语义，store 代码零改动），
//            写操作异步落盘：小状态进 Preferences，记录进 filesDir/readings.json 单文件
// 为什么记录走文件：导出/导入 = 复制这同一个 JSON（05 §5.2 格式），天然零成本；
// 且 Preferences（SharedPreferences）不适合放 MB 级 blob（09 Q3）。
import { Preferences } from '@capacitor/preferences'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { isNative } from './index'

const BIG_KEY = 'tarot.readings.v1'
const BIG_FILE = 'readings.json'
const SMALL_KEYS = [
  'tarot.settings.v1',
  'tarot.daily.v1',
  'tarot.tasks.v1',
  'tarot.onboarding.v1',
  // AI 配置含密钥：独立 key，不并入 settings（设置页导出备份会整体导出 settings，11 §7.2）
  'tarot.ai.v1',
]

const mirror = new Map<string, string>()
const dirty = new Set<string>()
let flushTimer: number | null = null

/** 启动时把原生侧数据读进内存镜像；web 端为空操作 */
export async function hydrateStorage(): Promise<void> {
  if (!isNative()) return

  await Promise.all(
    SMALL_KEYS.map(async (k) => {
      try {
        const r = await Preferences.get({ key: k })
        if (r.value != null) mirror.set(k, r.value)
      } catch {
        /* 读取失败按空处理，不阻塞启动 */
      }
    }),
  )

  try {
    const f = await Filesystem.readFile({ path: BIG_FILE, directory: Directory.Data })
    if (typeof f.data === 'string') mirror.set(BIG_KEY, f.data)
  } catch {
    /* 首次启动尚无记录文件 */
  }
}

/**
 * schema 版本与迁移（09 N5-1）：
 * 一旦有用户数据，就绝不用"清空重来"的方式升级（PinDou §4.1 教训）。
 * 新增迁移只在此登记，不散落到各处；顺序执行，失败即由调用方记录日志。
 */
export const SCHEMA_VERSION = 1
const SCHEMA_KEY = 'tarot.schema.v1'

const MIGRATIONS: Record<number, () => void> = {
  // 2: () => { /* v1→v2 的字段迁移 */ },
}

/** 首次安装写入当前版本；老版本按序执行迁移后升版 */
export function ensureSchema(): void {
  let current = 0
  try {
    const raw = storageGet(SCHEMA_KEY)
    if (raw) current = Number(JSON.parse(raw).version ?? 0)
  } catch {
    current = 0
  }
  if (current >= SCHEMA_VERSION) return
  for (let v = current + 1; v <= SCHEMA_VERSION; v++) MIGRATIONS[v]?.()
  storageSet(SCHEMA_KEY, JSON.stringify({ version: SCHEMA_VERSION, at: new Date().toISOString() }))
}

export function storageGet(key: string): string | null {
  if (!isNative()) return localStorage.getItem(key)
  return mirror.get(key) ?? null
}

export function storageSet(key: string, value: string): void {
  if (!isNative()) {
    localStorage.setItem(key, value)
    return
  }
  mirror.set(key, value)
  dirty.add(key)
  scheduleFlush()
}

function scheduleFlush(): void {
  if (flushTimer != null) return
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    void flushStorage()
  }, 400)
}

/** 立即落盘（应用进入后台/退出前调用，防丢最后 400ms 内的写入） */
export async function flushStorage(): Promise<void> {
  if (flushTimer != null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (!isNative() || dirty.size === 0) return
  const keys = [...dirty]
  dirty.clear()
  await Promise.all(
    keys.map(async (k) => {
      const v = mirror.get(k)
      if (v == null) return
      try {
        if (k === BIG_KEY) {
          await Filesystem.writeFile({
            path: BIG_FILE,
            data: v,
            directory: Directory.Data,
            encoding: Encoding.UTF8,
          })
        } else {
          await Preferences.set({ key: k, value: v })
        }
      } catch {
        dirty.add(k) // 落盘失败：留待下次重试
      }
    }),
  )
}
