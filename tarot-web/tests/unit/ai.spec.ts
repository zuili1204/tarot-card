import { describe, expect, it } from 'vitest'
import type { AiConfig, ReadingSnapshot } from '@/types'
import { AI_DEFAULTS, aiReady, clearAiConfig, loadAiConfig, validateAiConfig } from '@/platform/aiStore'
import {
  AiError,
  chatUrl,
  DEFAULT_TIMEOUT_MS,
  enhance,
  parseChatResponse,
  requestChat,
  scanAiText,
  buildContextFromSnapshot,
} from '@/engine/ai'
import { buildPrompt } from '@/engine/ai/prompt'
import { aiPrompt } from '@/data'

// node 环境无 localStorage：最小桩（与 history.spec 一致）
const ls: Record<string, string> = {}
;(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => ls[k] ?? null,
  setItem: (k: string, v: string) => {
    ls[k] = v
  },
  removeItem: (k: string) => delete ls[k],
}

const CFG: AiConfig = {
  enabled: true,
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: 'sk-test',
  model: 'deepseek-chat',
  temperature: 0.8,
  maxTokens: 1200,
}

function okFetcher(data: unknown, status = 200) {
  return async () => ({ status, data })
}

const SNAP: ReadingSnapshot = {
  id: 'r1',
  createdAt: '2026-09-13T00:00:00.000Z',
  question: {
    text: '这段异地恋要不要继续',
    domain: 'love',
    timeframeMonths: 3,
    scenarioId: 'long-distance',
    subScenarioId: 'ld-abroad',
  },
  spreadId: 'three-situation',
  cards: [
    { cardId: 'cups-2', reversed: false, positionNo: 1 },
    { cardId: 'major-13', reversed: true, positionNo: 2 },
  ],
  deckSnapshot: [],
  cutIndex: 1,
  interpretation: {
    intro: '开场白',
    positions: [
      { positionNo: 1, positionName: '现状', cardId: 'cups-2', reversed: false, variant: 'direct', text: '静态解读一' },
      { positionNo: 2, positionName: '症结', cardId: 'major-13', reversed: true, variant: 'soft', text: '静态解读二' },
    ],
    links: [{ a: 1, b: 2, type: 'tense', label: '拉扯', text: '关联文本' }],
    summary: {
      trendLabel: '持平',
      trendText: '趋势文本',
      majorText: '大牌文本',
      elementText: '元素文本',
      actionLead: '行动引导',
      actions: ['做一件事'],
    },
    closing: null,
  },
}

describe('AI 配置（11 §4.3 / §7.2）', () => {
  it('默认关闭——不配置即完全离线（R1 / R7）', () => {
    expect(AI_DEFAULTS.enabled).toBe(false)
  })

  it('https 地址通过；缺 key / 缺 model 被拦', () => {
    expect(validateAiConfig(CFG)).toBeNull()
    expect(validateAiConfig({ ...CFG, apiKey: '' })).toContain('API Key')
    expect(validateAiConfig({ ...CFG, model: '  ' })).toContain('模型')
  })

  it('明文 http 只放行本机与局域网', () => {
    expect(validateAiConfig({ ...CFG, baseUrl: 'http://localhost:11434/v1' })).toBeNull()
    expect(validateAiConfig({ ...CFG, baseUrl: 'http://192.168.1.9:11434/v1' })).toBeNull()
    expect(validateAiConfig({ ...CFG, baseUrl: 'http://example.com/v1' })).toContain('https')
  })

  it('aiReady 要求 enabled + 地址 + key + model 俱全', () => {
    expect(aiReady(CFG)).toBe(true)
    expect(aiReady({ ...CFG, enabled: false })).toBe(false)
    expect(aiReady({ ...CFG, apiKey: '' })).toBe(false)
  })

  it('配置独立存储，清除后回到默认（不含密钥）', () => {
    clearAiConfig()
    const c = loadAiConfig()
    expect(c.apiKey).toBe('')
    expect(c.enabled).toBe(false)
  })
})

describe('AI 协议客户端（11 §5.4）', () => {
  it('chatUrl 容忍末尾斜杠与"粘贴了完整路径"', () => {
    expect(chatUrl('https://a.com/v1/')).toBe('https://a.com/v1/chat/completions')
    expect(chatUrl('https://a.com/v1')).toBe('https://a.com/v1/chat/completions')
    expect(chatUrl('https://a.com/v1/chat/completions')).toBe('https://a.com/v1/chat/completions')
    expect(chatUrl('https://a.com/v1/chat/completions/')).toBe('https://a.com/v1/chat/completions')
  })

  it('成功响应解析出正文 / 模型 / usage', async () => {
    const r = await requestChat(
      CFG,
      [{ role: 'user', content: 'hi' }],
      {
        fetcher: okFetcher({
          choices: [{ message: { content: '正文内容' } }],
          model: 'deepseek-chat',
          usage: { prompt_tokens: 10, completion_tokens: 20 },
        }),
      },
    )
    expect(r.text).toBe('正文内容')
    expect(r.model).toBe('deepseek-chat')
    expect(r.usage).toEqual({ prompt: 10, completion: 20 })
  })

  it('状态码映射为对应错误码', async () => {
    const cases: [number, string][] = [
      [400, 'bad_request'],
      [401, 'unauthorized'],
      [403, 'unauthorized'],
      [404, 'not_found'],
      [429, 'rate_limited'],
      [500, 'server'],
    ]
    for (const [status, code] of cases) {
      await expect(requestChat(CFG, [], { fetcher: okFetcher({}, status) })).rejects.toMatchObject({ code })
    }
  })

  it('地址不可达 → network（**不能**笼统报成跨域）', async () => {
    await expect(
      requestChat(CFG, [], {
        fetcher: async () => { throw new TypeError('Failed to fetch') },
        probe: async () => false,
      }),
    ).rejects.toMatchObject({ code: 'network' })
  })

  it('地址可达但请求被拦 → cors', async () => {
    await expect(
      requestChat(CFG, [], {
        fetcher: async () => { throw new TypeError('Failed to fetch') },
        probe: async () => true,
      }),
    ).rejects.toMatchObject({ code: 'cors' })
  })

  it('超时：AbortError → timeout', async () => {
    await expect(
      requestChat(CFG, [], {
        fetcher: async () => { throw new DOMException('aborted', 'AbortError') },
      }),
    ).rejects.toMatchObject({ code: 'timeout' })
  })

  it('缺少配置不发请求', async () => {
    await expect(requestChat({ ...CFG, apiKey: '' }, [])).rejects.toMatchObject({
      code: 'not_configured',
    })
  })

  it('连通性测试允许空正文（带思考链的模型常见）', async () => {
    const r = await requestChat(CFG, [], {
      fetcher: okFetcher({
        choices: [{ message: { role: 'assistant', content: '', reasoning_content: '思考中' }, finish_reason: 'length' }],
        model: 'deepseek-flash',
      }),
      allowEmpty: true,
    })
    expect(r.text).toBe('')
    expect(r.model).toBe('deepseek-flash')
  })

  it('正式生成时空正文仍报错，并说清是"思考占满配额"', async () => {
    let msg = ''
    try {
      await requestChat(CFG, [], {
        fetcher: okFetcher({
          choices: [{ message: { content: '', reasoning_content: '思考中' }, finish_reason: 'length' }],
        }),
      })
    } catch (e) {
      msg = e instanceof AiError ? e.message : ''
    }
    expect(msg).toContain('最大 token')
    expect(msg).toContain('reasoning_content')
  })

  it('结构与默认超时：空 choices 判为 parse', () => {
    expect(() => parseChatResponse({ choices: [] }, 'm')).toThrow(AiError)
    expect(DEFAULT_TIMEOUT_MS).toBe(30_000)
  })
})

describe('Prompt 组装（11 §6）', () => {
  it('system 含全部立场条款，user 含每个牌位与静态解读', () => {
    const ctx = buildContextFromSnapshot(SNAP)
    const { system, user, promptVersion } = buildPrompt(ctx, aiPrompt)

    expect(system).toContain(aiPrompt.role)
    for (const s of aiPrompt.stance) expect(system).toContain(s)
    expect(system).toContain(aiPrompt.output)

    expect(user).toContain('这段异地恋要不要继续')
    expect(user).toContain('感情')
    expect(user).toContain('异地恋')
    expect(user).toContain('异国恋')
    // 每个牌位：位置名 + 牌名 + 正逆位 + 该位静态解读
    expect(user).toContain('现状')
    expect(user).toContain('圣杯 2')
    expect(user).toContain('正位')
    expect(user).toContain('静态解读一')
    expect(user).toContain('死神')
    expect(user).toContain('逆位')
    expect(user).toContain('静态解读二')
    // 关联位
    expect(user).toContain('关联文本')
    expect(promptVersion).toBeGreaterThanOrEqual(1)
  })

  it('子情境缺省时占位，结构不塌', () => {
    const ctx = buildContextFromSnapshot({ ...SNAP, question: { ...SNAP.question, subScenarioId: undefined } })
    const { user } = buildPrompt(ctx, aiPrompt)
    expect(user).toContain(aiPrompt.labels.sub)
    expect(user).toContain(aiPrompt.labels.subNone)
  })
})

describe('AI 输出合规后检（11 §6.4）', () => {
  it('命中 block 禁词并**不改写**原文', () => {
    const text = '这次操作稳赚，放心去做。'
    const flagged = scanAiText(text)
    expect(flagged.length).toBeGreaterThan(0)
    // 只标记：文本未被替换
    expect(text).toBe('这次操作稳赚，放心去做。')
  })

  it('正常文本无命中', () => {
    expect(scanAiText('牌面倾向于让你先缓一缓。')).toEqual([])
  })
})

describe('enhance 编排（11 §5.2）', () => {
  it('未启用直接拒绝，不发请求', async () => {
    await expect(enhance(SNAP, { ...CFG, enabled: false })).rejects.toMatchObject({
      code: 'not_configured',
    })
  })

  it('成功时带 promptVersion；命中禁词只标记不改写', async () => {
    const r = await enhance(SNAP, CFG, {
      fetcher: okFetcher({ choices: [{ message: { content: '这次稳赚，倾向是往前。' } }], model: 'm' }),
    })
    expect(r.text).toContain('稳赚') // 原文未被篡改
    expect(r.flagged?.length).toBeGreaterThan(0)
    expect(r.promptVersion).toBeGreaterThanOrEqual(1)
    expect(r.provider).toBe('deepseek')
  })
})
