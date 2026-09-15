// AI 深度解读编排（11 §5.2）：prompt → 请求 → 解析 → 后检
// 对外只暴露 04 §4.3 约定的 enhance() 语义；未启用/失败一律 reject，由 UI 降级（02 §5.5）。
import type { AiConfig, AiInterpretation, ReadingSnapshot } from '@/types'
import { aiPrompt, cardMap, scenarioMap, spreadMap, subScenarioMap } from '@/data'
import { DOMAIN_NAME } from '@/engine/stats'
import {
  AiError,
  canControlThinking,
  requestChat,
  type ChatMessage,
  type ChatResult,
  type RequestChatOptions,
} from './client'
import { buildPrompt, type AiContext } from './prompt'
import { scanAiText } from './scan'

export { AiError, requestChat, chatUrl, parseChatResponse, DEFAULT_TIMEOUT_MS } from './client'
export type { AiErrorCode, ChatResult, ChatMessage } from './client'
export { PROMPT_VERSION } from './prompt'
export { scanAiText } from './scan'

/** 由快照组装 AI 上下文：只用本次占卜已有的数据，不引入任何新变量（07 §4 / C3） */
export function buildContextFromSnapshot(s: ReadingSnapshot): AiContext {
  const spread = spreadMap.get(s.spreadId)
  const q = s.question

  const positions = s.interpretation.positions.map((p) => {
    const card = cardMap.get(p.cardId)
    const slot = spread?.positions.find((x) => x.no === p.positionNo)
    return {
      no: p.positionNo,
      name: p.positionName,
      meaning: slot?.meaning ?? '',
      cardName: card?.nameZh ?? p.cardId,
      reversed: p.reversed,
      text: p.text,
    }
  })

  return {
    question: q.text,
    domainName: DOMAIN_NAME[q.domain] ?? q.domain,
    scenarioName: q.scenarioId ? scenarioMap.get(q.scenarioId)?.nameZh : undefined,
    subScenarioName: q.subScenarioId ? subScenarioMap.get(q.subScenarioId)?.nameZh : undefined,
    timeframeMonths: q.timeframeMonths,
    spreadName: spread?.nameZh ?? s.spreadId,
    positions,
    linkTexts: s.interpretation.links.map((l) => `${l.label}：${l.text}`),
  }
}

export interface AiAdapter {
  enhance(snapshot: ReadingSnapshot): Promise<AiInterpretation>
}

/**
 * 把 AiError 翻成给用户看的一句话：文案取自内容层 rituals.ai.err，
 * 再补上引擎带回来的细节（如原始响应预览）——没有细节就只能让用户"重试"三次然后放弃。
 */
export function describeAiError(e: unknown, errText: Record<string, string>): string {
  const code = e instanceof AiError ? e.code : 'unknown'
  const base = errText[code] ?? errText.unknown ?? '没能拿到解读。'
  const detail = e instanceof AiError ? (e.message ?? '') : e instanceof Error ? e.message : ''
  // 同一句话不重复出现（多数错误码的 message 就是原始异常文本）
  if (!detail || base.includes(detail) || detail === code) return base
  return `${base}\n（${detail.slice(0, 220)}）`
}

/** 生成（或重新生成）AI 深度解读；失败抛 AiError，调用方负责降级与提示 */
export async function enhance(
  snapshot: ReadingSnapshot,
  cfg: AiConfig,
  opts: RequestChatOptions = {},
): Promise<AiInterpretation> {
  if (!cfg.enabled) throw new AiError('not_configured')

  const ctx = buildContextFromSnapshot(snapshot)
  const { system, user, promptVersion } = buildPrompt(ctx, aiPrompt)

  const msgs: ChatMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]

  const res = await generateWithFallback(cfg, msgs, opts)

  const flagged = scanAiText(res.text)
  return {
    text: res.text,
    model: res.model,
    provider: cfg.provider,
    at: new Date().toISOString(),
    promptVersion,
    ...(flagged.length ? { flagged } : {}),
    ...(res.usage ? { usage: res.usage } : {}),
  }
}

async function generateWithFallback(
  cfg: AiConfig,
  msgs: ChatMessage[],
  opts: RequestChatOptions,
): Promise<ChatResult> {
  const canThink = canControlThinking(cfg)
  const base = cfg.maxTokens || 1024
  const bumped = Math.min(Math.max(base * 4, 8192), 8192)
  const steps: RequestChatOptions[] = canThink
    ? [{ ...opts, thinking: false }, { ...opts }, { ...opts, thinking: false, maxTokens: bumped }]
    : [{ ...opts }, { ...opts, maxTokens: bumped }]
  let last: unknown
  for (const step of steps) {
    try {
      return await requestChat(cfg, msgs, step)
    } catch (e) {
      last = e
      if (!(e instanceof AiError) || !e.truncated) throw e
    }
  }
  throw last
}

