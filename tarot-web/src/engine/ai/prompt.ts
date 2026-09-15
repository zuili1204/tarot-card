// Prompt 组装（11 §6）：纯函数，便于单测
// 纪律：system 的立场条款与全部模板标签都来自内容层（rituals.ai.prompt），引擎零硬编码文案（04 §4）。
export const PROMPT_VERSION = 1

export interface AiPositionContext {
  no: number
  name: string
  /** 该位置的含义（来自 spreads.json） */
  meaning: string
  cardName: string
  reversed: boolean
  /** 该位的静态解读全文（来自快照，不是让模型现编） */
  text: string
}

export interface AiContext {
  question: string
  domainName: string
  scenarioName?: string
  subScenarioName?: string
  timeframeMonths: number
  spreadName: string
  positions: AiPositionContext[]
  /** 关联位叙述（links 段，可空） */
  linkTexts?: string[]
}

export interface AiPromptRules {
  role: string
  /** 立场硬约束，逐条注入 system（11 §3.1） */
  stance: string[]
  /** 输出契约（段数 / 字数 / 语气） */
  output: string
  /** 模板标签；键的完整性由 sync-content.mjs 的 ai-prompt 结构校验保证 */
  labels: Record<string, string>
}

export interface BuiltPrompt {
  system: string
  user: string
  promptVersion: number
}

export function buildPrompt(ctx: AiContext, rules: AiPromptRules): BuiltPrompt {
  const system = [rules.role, ...(rules.stance ?? []), rules.output].filter(Boolean).join('\n')
  const L = rules.labels

  // 领域一行：领域｜场景｜子情境（子情境缺省用 subNone 占位，保持结构稳定）
  let tags = L.domain + ctx.domainName
  if (ctx.scenarioName) tags += `｜${L.scenario}${ctx.scenarioName}`
  tags += `｜${L.sub}${ctx.subScenarioName ?? L.subNone}`

  const lines: string[] = [
    `${L.question}${ctx.question}`,
    tags,
    `${L.timeframe}${ctx.timeframeMonths} 个月内`,
    `${L.spread}${ctx.spreadName}`,
    '',
    L.cards,
  ]

  for (const p of ctx.positions) {
    const dir = p.reversed ? L.reversed : L.upright
    lines.push(`${p.no}. ${p.name}（${p.meaning}）：${p.cardName}（${dir}）— ${p.text}`)
  }

  if (ctx.linkTexts?.length) {
    lines.push('')
    lines.push(L.links)
    for (const t of ctx.linkTexts) lines.push(`- ${t}`)
  }

  lines.push('')
  lines.push(L.closing)

  return { system, user: lines.join('\n'), promptVersion: PROMPT_VERSION }
}
