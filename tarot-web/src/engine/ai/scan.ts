// AI 输出的合规后检（11 §6.4）
// 与内容闸同源：复用 compliance.json 的 block 级词表（10 §11.1）。
// **只标记，不改写**——soften() 的静默替换会破坏语义且无法追溯，故此处不调用它。
import { bannedWords } from '@/data'

/** 返回命中的禁词 pattern 列表（空数组 = 未命中） */
export function scanAiText(text: string): string[] {
  if (!text) return []
  const hits: string[] = []
  for (const w of bannedWords) {
    if (w.level !== 'block') continue
    try {
      if (new RegExp(w.pattern).test(text)) hits.push(w.pattern)
    } catch {
      /* 非法正则跳过，不因词表问题阻断使用 */
    }
  }
  return hits
}
