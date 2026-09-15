// AI 配置存储（11 §7.2）
// 独立 key 的理由：设置页「导出备份」会把整个 settings state 写进备份文件，
// 密钥若并进 settings 就会随用户随手分享的 JSON 一起外泄。密钥只落 tarot.ai.v1，
// 且导出默认不含（SettingsView 显式勾选才带出，见 11 §7.2 / R3）。
import type { AiConfig, AiProvider } from '@/types'
import { storageGet, storageSet } from './storage'

export const AI_KEY = 'tarot.ai.v1'

/** 服务商预设（11 §4.2）：选预设自动带出 baseUrl 与 model，用户仍可改 */
export const AI_PRESETS: { key: AiProvider; label: string; baseUrl: string; model: string }[] = [
  { key: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  // 模型名以服务商**当前**文档为准——它们会随版本更替（DeepSeek 2026 起为 deepseek-flash / deepseek-v4-pro），
  // 预设只是初始值，随时可在设置页改。
  { key: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash' },
  {
    key: 'siliconflow',
    label: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-7B-Instruct',
  },
  { key: 'moonshot', label: '月之暗面', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { key: 'zhipu', label: '智谱', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { key: 'ollama', label: 'Ollama（本地）', baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5:7b' },
  { key: 'custom', label: '自定义', baseUrl: '', model: '' },
]

export function presetOf(provider: AiProvider) {
  return AI_PRESETS.find((p) => p.key === provider)
}

/** 默认关闭——不配置即完全离线（R1 / R7） */
export const AI_DEFAULTS: AiConfig = {
  enabled: false,
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com',
  apiKey: '',
  model: 'deepseek-flash',
  temperature: 0.8,
  // 默认给到 2000：带思考链的模型（如 deepseek-flash）会先用掉几百 token 思考，
  // 1200 容易被挤到只输出一半；这只是上限，不影响实际用量与费用。
  maxTokens: 2000,
}

export function loadAiConfig(): AiConfig {
  try {
    const raw = storageGet(AI_KEY)
    if (raw) return { ...AI_DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* 损坏则回落默认，且默认关闭（最安全的一侧） */
  }
  return { ...AI_DEFAULTS }
}

export function saveAiConfig(cfg: AiConfig): void {
  storageSet(AI_KEY, JSON.stringify(cfg))
}

/** 清除配置（含密钥与知情确认），回到默认关闭态 */
export function clearAiConfig(): void {
  storageSet(AI_KEY, JSON.stringify({ ...AI_DEFAULTS }))
}

/** 是否具备发起请求的最小条件 */
export function aiReady(cfg: AiConfig): boolean {
  return cfg.enabled && !!cfg.baseUrl.trim() && !!cfg.apiKey.trim() && !!cfg.model.trim()
}

/**
 * 配置校验（11 §4.3）：返回首条错误提示，通过返回 null。
 * 不做连通性强校验（离线时也要能存），连通性交给「测试连接」。
 */
export function validateAiConfig(cfg: AiConfig): string | null {
  const url = cfg.baseUrl.trim()
  if (!url) return '请填写接口地址。'
  if (!/^https?:\/\/.+/i.test(url)) return '接口地址需要以 http:// 或 https:// 开头。'
  // http 明文仅放行本机与局域网（自建 Ollama / 网关场景）
  if (/^http:\/\//i.test(url)) {
    const host = safeHost(url)
    const lan = /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/
    if (!host || !lan.test(host)) return '明文 http 只允许本机或局域网地址，其余请用 https。'
  }
  if (!cfg.apiKey.trim()) return '请填写 API Key（Ollama 可填任意非空字符）。'
  if (!cfg.model.trim()) return '请填写模型名称。'
  return null
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

/** 展示用：把地址脱敏为域名（知情弹窗里给用户看"发给谁"） */
export function hostLabel(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
