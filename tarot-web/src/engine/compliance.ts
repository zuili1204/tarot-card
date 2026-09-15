// 合规运行时兜底（02 §5.4 / 04 §4：模板万一带出禁词，产出前替换为倾向式话术）
// 词表母版 = src/data/compliance.json（构建闸 scripts/sync-content.mjs 同源共用）。
import { bannedWords } from '@/data'

const rules = [...bannedWords]
  .sort((a, b) => b.pattern.length - a.pattern.length) // 长词优先，避免子串误替换
  .map((w) => ({ ...w, re: new RegExp(w.pattern, 'g') }))

/** 文本软化为倾向式表达（warn 级替换为倾向式；block 级构建闸已拦截，此处删除兜底） */
export function soften(text: string): string {
  let out = text
  for (const rule of rules) out = out.replace(rule.re, rule.replacement)
  return out
}
