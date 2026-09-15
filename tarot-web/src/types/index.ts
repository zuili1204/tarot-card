// 数据结构类型（05 数据字典的 TS 化）

export type Suit = 'major' | 'wands' | 'cups' | 'swords' | 'pentacles'
export type Rank =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20' | '21'
  | 'ace' | 'page' | 'knight' | 'queen' | 'king'
/**
 * 问题域（10-占卜方向与场景拓展规划：10 实质域 + general 兜底 = 11 个）。
 * 前三者对应 card.domains 的初始三键；学业域自 v1.0 起从 career 独立（Q16）。
 * `general`（综合）只用于是/否单抽这类不选域的轻玩法——引擎取不到对应域文案时降级到 core（01 §3.5）。
 * 新域的 card.domains 牌义按设计后补（降级链兜底），引擎以可选链访问，缺键不崩。
 */
export type DomainKey =
  | 'love' | 'career' | 'wealth' | 'study' | 'family'
  | 'social' | 'growth' | 'wellbeing' | 'place' | 'create' | 'general'
export type YesNo = 'yes' | 'no' | 'vague'
export type Element = '火' | '水' | '风' | '土'

export interface Card {
  id: string
  suit: Suit
  rank: Rank
  nameZh: string
  nameEn: string
  number: string | null
  astrology: string | null
  element: Element
  image: string
  keywords: { up: string[]; rev: string[] }
  core: { up: string; rev: string }
  domains: Record<DomainKey, { up: string; rev: string }>
  advice: string
  yesNo: YesNo
  tags: string[]
}

export interface SpreadPosition {
  no: number
  name: string
  meaning: string
  /** 位置模板键（templates-positions.json 的 key，引擎组装单牌段用） */
  tpl: string
  x: number
  y: number
  rotate?: boolean
}

export interface Spread {
  id: string
  nameZh: string
  cardCount: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  /** 预计时长（分钟），选阵卡展示（08 竞品吸收点 #1） */
  minutes: number
  domains: string[]
  priority: 'P0' | 'P1' | 'P2'
  description: string
  positions: SpreadPosition[]
  links: { a: number; b: number; type: string }[]
  variants?: string[]
  /**
   * 入口归属：deep=S2 深度占卜（默认）；daily=S1 每日一抽；yesno=是/否单抽。
   * 选阵页只列 deep（09 N1：避免是/否专用阵出现在深度占卜里）。
   */
  entry?: 'deep' | 'daily' | 'yesno'
}

/* ---------- 占卜链路（M2） ---------- */

export interface Question {
  text: string
  domain: DomainKey
  /** 时效（月） */
  timeframeMonths: 1 | 3 | 6
  /** Ask 页命中场景时写入 */
  scenarioId?: string
  /** 可选：命中的子情境 id（10 §5.2；Q19 决议子情境可跳过） */
  subScenarioId?: string
}

export interface DrawnCard {
  cardId: string
  reversed: boolean
  positionNo: number
}

export type CallbackVariant = 'direct' | 'soft' | 'neutral'

export interface PositionReading {
  positionNo: number
  positionName: string
  cardId: string
  reversed: boolean
  variant: CallbackVariant
  /** 组装完成的单牌段全文（快照） */
  text: string
}

export interface LinkReading {
  a: number
  b: number
  type: string
  label: string
  text: string
}

export interface SummaryReading {
  trendLabel: string
  trendText: string
  majorText: string
  elementText: string
  actionLead: string
  actions: string[]
}

export interface ReadingInterpretation {
  intro: string
  positions: PositionReading[]
  links: LinkReading[]
  summary: SummaryReading
  closing: string | null
}

export interface ReadingSnapshot {
  id: string
  createdAt: string
  question: Question
  spreadId: string
  cards: DrawnCard[]
  /** 洗牌瞬间的全量排列（可验证随机，07 §3） */
  deckSnapshot: string[]
  cutIndex: 1 | 2 | 3
  /** 产文即快照：不随牌义库更新改写 */
  interpretation: ReadingInterpretation
  /** AI 深度解读（S5，11 §7.1）：可选字段，老记录无此键 = 未生成过 */
  ai?: AiInterpretation
}

/* ---------- 内容层（docs/content → src/data/content） ---------- */

export interface Scenario {
  id: string
  nameZh: string
  basedOn: DomainKey
  keywords: string[]
  questionPatterns: string[]
  intro: string
  /** 同义词 / 网络语（10 §5.3）：仅用于识别，不作展示名（§11.3） */
  aliases?: string[]
  /** 多命中时的优先级，默认 1（10 §5.3） */
  weight?: number
  /** 需文案回引自身的敏感类（10 §7 红线 / §14.1 单独审校） */
  sensitive?: boolean
}

/** 子情境（10 §5.2）：只提供开场白 / 收束语 / 关键词 / 推荐牌阵，牌义沿用父场景→域→核心 */
export interface SubScenario {
  id: string
  /** 父场景 id */
  parent: string
  nameZh: string
  keywords: string[]
  intro: string
  closing: string
  spreadHint: string
}

export interface PositionTemplate {
  nameZh: string
  intro: string
  callback: Record<CallbackVariant, string>
}

export interface LinkRelation {
  type: 'same' | 'friendly' | 'tense' | 'neutral' | 'mixed'
  label: string
  upUp: string
  upRev: string
  revUp: string
  revRev: string
}

export interface BannedWord {
  pattern: string
  level: 'block' | 'warn'
  reason: string
  replacement: string
}

/* ---------- AI 深度解读（S5 / 11-AI深度解读开发规划） ---------- */

/**
 * 服务商预设（11 §4.2）。协议统一为 OpenAI Chat Completions 兼容一套（Q24 决议），
 * 覆盖官方服务、国内服务与自建网关；不做 Anthropic / Gemini 原生协议。
 */
export type AiProvider =
  | 'openai' | 'deepseek' | 'siliconflow' | 'moonshot' | 'zhipu' | 'ollama' | 'custom'

/** BYOK 配置：应用不内置任何模型与密钥，全部由用户自填（11 §0.1） */
export interface AiConfig {
  /** 总开关：false 时应用不发任何网络请求（R1 / R7） */
  enabled: boolean
  provider: AiProvider
  /** OpenAI 兼容根地址，如 https://api.deepseek.com/v1 */
  baseUrl: string
  /** 仅存本机（tarot.ai.v1）；绝不并入 settings，也不进导出备份（11 §7.2） */
  apiKey: string
  model: string
  /** 默认 0.8 */
  temperature: number
  /** 默认 1200（R6：控成本与响应时长） */
  maxTokens: number
  /** 一次性知情确认时间；baseUrl 变更后需重新确认（11 §3.3） */
  confirmedAt?: string
  /** 上次测试连接结果（UI 展示用，不参与请求） */
  lastTest?: { ok: boolean; at: string; model?: string; ms?: number; message?: string }
}

/** AI 解读结果（随快照落库，快照不回写——05 §5.2） */
export interface AiInterpretation {
  text: string
  model: string
  provider: AiProvider
  at: string
  /** prompt 版本：改提示词只升版本，不回写老记录（11 §6.3） */
  promptVersion: number
  /** 合规后检命中的禁词——只标记，未改写原文（11 §6.4） */
  flagged?: string[]
  usage?: { prompt: number; completion: number }
}

/* ---------- 学习中心（07 §1.4 / 09 N2） ---------- */

export type LearnSectionType = 'lead' | 'h' | 'p' | 'list' | 'quote' | 'note'

export interface LearnSection {
  type: LearnSectionType
  /** lead/h/p/quote/note 用 */
  text?: string
  /** list 用 */
  items?: string[]
}

export interface LearnArticle {
  id: string
  title: string
  subtitle: string
  minutes: number
  sections: LearnSection[]
}
