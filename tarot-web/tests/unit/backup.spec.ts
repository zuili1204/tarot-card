// 备份闭环与存储 schema（09 N5-1 / N5-4）
// 备份闭环是"导出 → 卸载 → 重装 → 导入"这条链路的单测化版本：
// 真实卸载无法在单测里做，用"清空后再导入"等价模拟。
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useHistoryStore } from '@/stores/history'
import { SCHEMA_VERSION, ensureSchema } from '@/platform/storage'
import type { ReadingSnapshot } from '@/types'

// node 环境无 localStorage：最小桩（与 history.spec 一致）
const store: Record<string, string> = {}
;(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v
  },
  removeItem: (k: string) => delete store[k],
}

function make(id: string): ReadingSnapshot {
  return {
    id,
    createdAt: '2026-09-08T12:00:00.000Z',
    question: { text: '测试问题', domain: 'general', timeframeMonths: 1 },
    spreadId: 'yesno-single',
    cards: [{ cardId: 'major-0', reversed: false, positionNo: 1 }],
    deckSnapshot: ['major-0'],
    cutIndex: 1,
    interpretation: {
      intro: '快照文本',
      positions: [
        { positionNo: 1, positionName: '答案', cardId: 'major-0', reversed: false, variant: 'neutral', text: '愚人：原始文案' },
      ],
      links: [],
      summary: { trendLabel: '', trendText: '', majorText: '', elementText: '', actionLead: '', actions: [] },
      closing: null,
    },
  }
}

describe('备份闭环', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    for (const k of Object.keys(store)) delete store[k]
  })

  it('导出 → 清库 → 导入：记录完整恢复（模拟换机或重装）', () => {
    const h = useHistoryStore()
    h.save(make('r-1'))
    h.save(make('r-2'))
    // 模拟写文件再读回（序列化往返）
    const exported = JSON.parse(JSON.stringify({ app: 'tarot-card', version: 1, readings: h.readings }))

    for (const r of [...h.readings]) h.remove(r.id)
    expect(h.count).toBe(0)

    const added = h.importReadings(exported.readings)
    expect(added).toBe(2)
    expect(h.count).toBe(2)
    expect(h.get('r-1')).toBeDefined()
    expect(h.get('r-2')).toBeDefined()
  })

  it('重复导入按 id 去重，不产生副本', () => {
    const h = useHistoryStore()
    h.save(make('r-1'))
    expect(h.importReadings([make('r-1')])).toBe(0)
    expect(h.count).toBe(1)
  })

  it('结构不合格的条目被丢弃（脏备份文件不污染历史）', () => {
    const h = useHistoryStore()
    const dirty: unknown[] = [make('r-ok'), { id: 'x' }, null, 'string', { id: 'y', question: 1 }]
    expect(h.importReadings(dirty)).toBe(1)
    expect(h.count).toBe(1)
    expect(h.get('r-ok')).toBeDefined()
  })

  it('非数组输入返回 0（文件结构完全不对时不崩）', () => {
    const h = useHistoryStore()
    expect(h.importReadings(null)).toBe(0)
    expect(h.importReadings({})).toBe(0)
    expect(h.count).toBe(0)
  })
})

describe('存储 schema', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    for (const k of Object.keys(store)) delete store[k]
  })

  it('首次启动写入当前版本，重复调用幂等', () => {
    ensureSchema()
    expect(JSON.parse(store['tarot.schema.v1']).version).toBe(SCHEMA_VERSION)
    ensureSchema()
    expect(JSON.parse(store['tarot.schema.v1']).version).toBe(SCHEMA_VERSION)
  })

  it('已有更高版本时不降级', () => {
    store['tarot.schema.v1'] = JSON.stringify({ version: SCHEMA_VERSION + 1 })
    ensureSchema()
    expect(JSON.parse(store['tarot.schema.v1']).version).toBe(SCHEMA_VERSION + 1)
  })
})
