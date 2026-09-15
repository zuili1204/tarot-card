// 场景 / 子情境识别（10 §6.1「提问优先，选择兜底」）
// 纪律：纯函数、无 DOM 依赖——便于单测与 §14.1「30 条真实问法命中率 ≥80%」的批处理验证。
import { scenarios, subScenariosByParent } from '@/data'
import type { DomainKey, Scenario, SubScenario } from '@/types'

export interface MatchResult {
  /** 最佳命中场景（未命中为 null） */
  scenario: Scenario | null
  /** 候选场景（按相关度降序，供手动选择兜底，10 §6.1） */
  candidates: Scenario[]
  /** 父场景下自动识别到的子情境（可跳过，Q19） */
  subScenario: SubScenario | null
  /** 该场景下的全部可选子情境 */
  subOptions: SubScenario[]
}

const EMPTY: MatchResult = { scenario: null, candidates: [], subScenario: null, subOptions: [] }

/** 命中层级：问法 > 关键词 > 同义词（同义词含网络语，仅作识别，§11.3） */
function hitLevel(s: Scenario, q: string): 0 | 1 | 2 | 3 {
  if (s.questionPatterns.some((p) => q.includes(p) || p.includes(q))) return 3
  if (s.keywords.some((k) => q.includes(k))) return 2
  if (s.aliases?.some((a) => q.includes(a))) return 1
  return 0
}

/**
 * 相关度：命中层级 ×10 + weight（10 §5.3）+ 同域加成
 * 同域加成是因为域为用户必选项，同域命中优先级高于跨域。
 */
function relevance(level: number, s: Scenario, inDomain: boolean): number {
  return level * 10 + (s.weight ?? 1) + (inDomain ? 5 : 0)
}

/** 识别一句话属于哪个场景 / 子情境 */
export function matchScenario(text: string, domain?: DomainKey | null): MatchResult {
  const q = text.trim()
  if (q.length < 4) return EMPTY

  const scored: { s: Scenario; score: number }[] = []
  for (const s of scenarios) {
    const level = hitLevel(s, q)
    if (level > 0) scored.push({ s, score: relevance(level, s, !!domain && s.basedOn === domain) })
  }
  scored.sort((a, b) => b.score - a.score)

  // 域优先（10 §6.1）：域是用户必选项，域内命中一律排在域外之前
  const inDomain = domain ? scored.filter((x) => x.s.basedOn === domain) : []
  const ordered = inDomain.length
    ? [...inDomain, ...scored.filter((x) => x.s.basedOn !== domain)]
    : scored
  const candidates = ordered.map((x) => x.s)
  const scenario = candidates[0] ?? null
  if (!scenario) return EMPTY

  // 子情境：仅在父场景内按 keywords 匹配（10 §5.2 无牌义，只影响开场 / 收束 / 推荐阵）
  const subOptions = subScenariosByParent[scenario.id] ?? []
  const subScenario = subOptions.find((s) => s.keywords.some((k) => q.includes(k))) ?? null

  return { scenario, candidates, subScenario, subOptions }
}
