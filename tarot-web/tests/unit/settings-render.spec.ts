import { beforeEach, describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import { rituals } from '@/data'
import SettingsView from '@/views/SettingsView.vue'

// node 环境无 localStorage：最小桩
const ls: Record<string, string> = {}
;(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => ls[k] ?? null,
  setItem: (k: string, v: string) => {
    ls[k] = v
  },
  removeItem: (k: string) => delete ls[k],
}

/** 服务端渲染设置页：不依赖浏览器，用来确认"页面真的会渲染出这些区块" */
async function renderSettings(): Promise<string> {
  const app = createSSRApp(SettingsView)
  app.use(createPinia())
  app.component('router-link', { props: ['to'], template: '<a><slot /></a>' })
  return renderToString(app)
}

describe('设置页渲染冒烟（防"功能做了但页面不显示"）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('渲染出 AI 深度解读分组与开关（默认关闭时给出离线说明）', async () => {
    const html = await renderSettings()
    expect(html).toContain(rituals.ai.groupTitle) // AI 深度解读
    expect(html).toContain(rituals.ai.enable) // 启用 AI 深度解读
    expect(html).toContain(rituals.ai.offline) // 当前完全离线
  })

  it('渲染出音效开关与其余既有开关', async () => {
    const html = await renderSettings()
    expect(html).toContain('音效')
    expect(html).toContain('逆位牌')
    expect(html).toContain('回顾提醒')
  })
})

describe('AI 文案键完整性（视图引用的键必须都在母版里）', () => {
  it('rituals.ai 含设置页与结果页引用的全部键', () => {
    const need = [
      'groupTitle', 'groupNote', 'enable', 'enableSub', 'offline',
      'provider', 'baseUrl', 'baseUrlHint', 'apiKey', 'apiKeyPlaceholder', 'model',
      'advanced', 'temperature', 'maxTokens', 'test', 'testing', 'testOk', 'testFail',
      'clear', 'clearConfirm', 'keyNote', 'sendNote', 'backupInclude',
      'modelHint', 'logView', 'logEmpty', 'logCopy', 'logCopied',
      'resultCta', 'notConfigured', 'needSave', 'generate', 'generating', 'cancel',
      'regenerate', 'badge', 'flagWarn', 'confirmTitle', 'confirmBody', 'confirmOk', 'confirmCancel',
    ]
    for (const k of need) expect(rituals.ai[k], `rituals.ai.${k}`).toBeTruthy()
    for (const code of [
      'not_configured', 'unauthorized', 'not_found', 'bad_request', 'rate_limited',
      'server', 'timeout', 'cors', 'network', 'offline', 'parse', 'unknown',
    ]) {
      expect(rituals.ai.err[code], `rituals.ai.err.${code}`).toBeTruthy()
    }
  })
})
