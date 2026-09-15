// OpenAI Chat Completions 兼容协议客户端（11 §5.2 / Q24）
// 纪律：错误只抛**机器可读的 code**，中文文案由 UI 从 rituals.ai.err 取——引擎零硬编码文案（04 §4）。
import type { AiConfig } from '@/types'
import { logError } from '@/platform/log'
import { postJson } from './http'

export type AiErrorCode =
  | 'not_configured'
  | 'unauthorized'
  | 'not_found'
  | 'bad_request'
  | 'rate_limited'
  | 'server'
  | 'timeout'
  | 'cors'
  | 'network'
  | 'offline'
  | 'parse'
  | 'unknown'

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message?: string,
    /** 因 max_tokens 被截断且正文为空——可放大上限 / 关闭思考后重试 */
    public truncated = false,
  ) {
    super(message ?? code)
    this.name = 'AiError'
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatUsage {
  prompt: number
  completion: number
}

export interface ChatResult {
  text: string
  model: string
  usage?: ChatUsage
}

/** 便于单测注入：实现一次 POST 并返回 { status, data } */
export type ChatFetcher = (o: {
  url: string
  headers: Record<string, string>
  body: unknown
  timeoutMs: number
  signal?: AbortSignal
}) => Promise<{ status: number; data: unknown }>

export const DEFAULT_TIMEOUT_MS = 30_000

/**
 * 拼出 chat/completions 地址。
 * 容忍三种常见粘贴错误：末尾多余斜杠、末尾已带 `/chat/completions`、末尾已带 `/v1/chat/completions`。
 */
export function chatUrl(baseUrl: string): string {
  let b = baseUrl.trim().replace(/\/+$/, '')
  b = b.replace(/\/chat\/completions$/, '')
  return `${b}/chat/completions`
}

interface ChatBody {
  model: string
  messages: ChatMessage[]
  temperature: number
  max_tokens: number
  stream: false
  /** DeepSeek V4 等支持：显式关思考（见 RequestChatOptions.thinking 注释） */
  thinking?: boolean
}

export interface RequestChatOptions {
  /** 单测注入用；不传则走平台 HTTP */
  fetcher?: ChatFetcher
  /** 单测注入用：可达性探测（默认用 no-cors fetch，避免测试走真实网络） */
  probe?: (url: string) => Promise<boolean>
  /**
   * 允许返回空正文（连通性测试用）。
   * 2026-09-13：deepseek-flash 这类模型会先产出思考链，小 max_tokens 下正文被挤没
   * （finish_reason=length、content 为空）。但"测试连接"只关心：网络通、key 有效、模型存在——
   * 拿到一个结构正确的 2xx 就够了，不该因为没正文就判失败。
   */
  allowEmpty?: boolean
  timeoutMs?: number
  signal?: AbortSignal
  /** 覆盖 cfg.maxTokens（截断时自动放大用） */
  maxTokens?: number
  /**
   * 显式控制"思考模式"（DeepSeek V4 等支持；不传则不下发该字段）。
   * 2026-09-13 教训：DeepSeek V4 默认思考档很高，会把 max_tokens 配额全用来推理，
   * 正文一个字都没轮到就触发 finish_reason=length（官方称"8K 陷阱"）。显式关掉即解。
   */
  thinking?: boolean
}

export async function requestChat(
  cfg: AiConfig,
  messages: ChatMessage[],
  opts: RequestChatOptions = {},
): Promise<ChatResult> {
  if (!cfg.baseUrl.trim() || !cfg.apiKey.trim() || !cfg.model.trim()) {
    throw new AiError('not_configured')
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const body: ChatBody = {
    model: cfg.model.trim(),
    messages,
    temperature: cfg.temperature,
    max_tokens: opts.maxTokens ?? cfg.maxTokens,
    stream: false, // v1 不做流式（Q25），字段保留以便 v2 直接开
  }
  if (opts.thinking !== undefined) body.thinking = opts.thinking
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.apiKey.trim()}`,
  }
  const url = chatUrl(cfg.baseUrl)

  let res: { status: number; data: unknown }
  try {
    res = opts.fetcher
      ? await opts.fetcher({ url, headers, body, timeoutMs, signal: opts.signal })
      : await postJson({ url, headers, body, timeoutMs })
  } catch (e) {
    const err = mapTransportError(e)
    logError(`[ai] ${err.code} ${url} :: ${e instanceof Error ? e.message : String(e)}`)
    // 'network' 只是"这次请求没成功"的兜底分类；真正的跨域只在**服务器可达**时才成立
    // （浏览器对不可达地址与跨域拦截抛的是同一个 TypeError: Failed to fetch）。
    // 用一次 no-cors 探测区分：能发出去 = 可达 = 大概率是跨域；发不出去 = 地址/网络问题。
    if (err.code === 'network') {
      const reachable = opts.probe ? await opts.probe(url) : await probeReachable(url)
      throw reachable ? new AiError('cors') : err
    }
    throw err
  }

  if (res.status < 200 || res.status >= 300) {
    // 服务商自己的报错文本进诊断日志，便于导出后定位（设置页「导出诊断日志」）
    const server = serverMessage(res.data)
    logError(`[ai] HTTP ${res.status} ${url} :: ${server ?? ''}`)

    if (res.status === 401 || res.status === 403) throw new AiError('unauthorized', server ?? undefined)
    if (res.status === 402 || res.status === 429) throw new AiError('rate_limited', server ?? undefined)
    if (res.status === 404) throw new AiError('not_found', server ?? undefined)
    // 400 大多不是"地址不对"而是"参数不对"，其中以模型名写错最常见
    if (res.status === 400) throw new AiError('bad_request', server ?? undefined)
    if (res.status >= 500) throw new AiError('server', server ?? undefined)
    throw new AiError('unknown', `HTTP ${res.status} ${server ?? ''}`)
  }

  return parseChatResponse(res.data, cfg.model, { allowEmpty: opts.allowEmpty })
}

/** 取服务商返回的错误文本（OpenAI 兼容：{error:{message}}），拿不到返回 null */
export function serverMessage(data: unknown): string | null {
  const d = data as { error?: { message?: string } } | null
  const m = d?.error?.message
  return typeof m === 'string' && m.trim() ? m.trim() : null
}

/** 响应体预览（截断），随 parse 错误一起抛出——没有它只能猜 */
function preview(data: unknown): string {
  try {
    const s = JSON.stringify(data)
    return s ? s.slice(0, 240) : String(data)
  } catch {
    return String(data)
  }
}

/**
 * 解析 OpenAI 兼容响应。
 * 2026-09-13：parse 错误必须带上原始响应预览——只说"格式不对"等于没法排查
 * （实际可能缺字段、content 为空、或被 max_tokens 截断）。
 */
export function parseChatResponse(
  data: unknown,
  fallbackModel: string,
  opts: { allowEmpty?: boolean; maxTokens?: number; thinking?: boolean } = {},
): ChatResult {
  const d = data as
    | {
        choices?: {
          message?: { content?: string; reasoning_content?: string }
          finish_reason?: string
        }[]
        model?: string
        usage?: { prompt_tokens?: number; completion_tokens?: number }
      }
    | null
  const choice = d?.choices?.[0]
  const text = choice?.message?.content
  if (typeof text !== 'string' || !text.trim()) {
    if (opts.allowEmpty) {
      // 连通性测试：结构正确即可，不要求有正文
      return { text: '', model: d?.model || fallbackModel, usage: readUsage(d?.usage) }
    }
    const reason = choice?.finish_reason
    // 最常见：DeepSeek V4 默认思考档高，配额被推理吃光
    const thinking = choice?.message?.reasoning_content ? '，且响应里只有思考内容（reasoning_content）' : ''
    const hint =
      reason === 'length'
        ? `响应被「最大 token」截断（finish_reason=length${thinking}）——已自动改用「关闭思考」重试仍失败，请在设置里把最大 token 调到 1500 以上，或换一个非思考模型。`
        : `拿不到 choices[0].message.content${thinking}。`
    throw new AiError('parse', `${hint}原始响应：${preview(data)}`, reason === 'length')
  }

  return {
    text: text.trim(),
    model: d?.model || fallbackModel,
    usage: readUsage(d?.usage),
  }
}

function readUsage(u?: { prompt_tokens?: number; completion_tokens?: number }): ChatUsage | undefined {
  return u && (u.prompt_tokens || u.completion_tokens)
    ? { prompt: u.prompt_tokens ?? 0, completion: u.completion_tokens ?? 0 }
    : undefined
}

function mapTransportError(e: unknown): AiError {
  if (e instanceof DOMException && e.name === 'AbortError') return new AiError('timeout')
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return new AiError('offline')
  const msg = e instanceof Error ? e.message : String(e)
  // web 的 fetch 对"跨域被拦 / 地址不可达 / DNS 失败 / TLS 失败"一律抛 TypeError: Failed to fetch，
  // 无法从这里区分——先归为 network，再由调用方用 no-cors 探测升级为 cors。
  if (/failed to fetch|networkerror|load failed|cors/i.test(msg)) return new AiError('network')
  if (/timeout|timed out/i.test(msg)) return new AiError('timeout')
  return new AiError('unknown', msg)
}

/**
 * 探测目标地址是否**可达**（不关心返回内容）。
 * no-cors 请求只要网络层面成功就会 resolve（拿到 opaque response），只有连不上才 reject——
 * 这正是区分"跨域被拦"与"地址不通"所需要的信号。
 */
async function probeReachable(url: string): Promise<boolean> {
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: '',
    })
    return true
  } catch {
    return false
  }
}

/** 该服务商是否支持显式控制"思考模式"（DeepSeek V4 等）。其它 OpenAI 兼容接口对未知字段常直接 400，故只放行 deepseek。 */
export function canControlThinking(cfg: AiConfig): boolean {
  if (cfg.provider === 'deepseek') return true
  try {
    return /(^|\.)deepseek\.(com|cn)$/i.test(new URL(cfg.baseUrl).hostname)
  } catch {
    return false
  }
}
