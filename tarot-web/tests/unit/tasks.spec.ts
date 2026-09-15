// M3 新手任务与每日一抽（07 §1.2/§2）：解锁三条件、去重、日期键、导入合并
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDailyStore } from '@/stores/daily'
import { useHistoryStore } from '@/stores/history'
import { useTaskStore } from '@/stores/task'

// node 环境无 localStorage：最小桩
const store: Record<string, string> = {}
;(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v
  },
  removeItem: (k: string) => delete store[k],
}

describe('taskStore 解锁（07 §2 三步全齐）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    for (const k of Object.keys(store)) delete store[k]
  })

  it('缺每日一抽时：三张阵 + 词典 3 张不解锁（M3 起任务①生效）', () => {
    const task = useTaskStore()
    task.recordThreeCardReading()
    task.recordViewed('major-0')
    task.recordViewed('major-1')
    task.recordViewed('major-2')
    expect(task.unlockedAdvanced).toBe(false)
  })

  it('三步全齐：每日一抽落库后解锁，finishedAt 落时间戳', () => {
    const task = useTaskStore()
    const daily = useDailyStore()
    task.recordThreeCardReading()
    task.recordViewed('major-0')
    task.recordViewed('major-1')
    task.recordViewed('major-2')
    expect(task.unlockedAdvanced).toBe(false)
    daily.saveToday({ cardId: 'cups-2', reversed: false })
    task.recordDailyDraw()
    expect(task.unlockedAdvanced).toBe(true)
    expect(task.finishedAt).toBeTruthy()
  })

  it('词典查看去重：同一张看两次只计一次', () => {
    const task = useTaskStore()
    task.recordViewed('major-13')
    task.recordViewed('major-13')
    expect(task.viewedCards).toEqual(['major-13'])
  })

  it('markTipsSeen 后 sawDrawTips 持久化', () => {
    const task = useTaskStore()
    expect(task.sawDrawTips).toBe(false)
    task.markTipsSeen()
    expect(JSON.parse(store['tarot.tasks.v1']).sawDrawTips).toBe(true)
  })
})

describe('dailyStore（07 §1.2 每日一抽）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    for (const k of Object.keys(store)) delete store[k]
  })

  it('today/saveToday 按本地日期键读写，recentDays 升序取尾（最新=今天）', () => {
    const daily = useDailyStore()
    expect(daily.today()).toBeNull()
    daily.entries['2026-09-01'] = { cardId: 'major-1', reversed: false }
    daily.saveToday({ cardId: 'cups-ace', reversed: false })
    expect(daily.today()?.cardId).toBe('cups-ace')
    const rec = daily.recentDays(2)
    expect(rec).toHaveLength(2)
    expect(rec[0].date).toBe('2026-09-01')
    expect(rec[rec.length - 1].entry.cardId).toBe('cups-ace')
  })
})

describe('historyStore 导入（设置页，按 id 去重）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    for (const k of Object.keys(store)) delete store[k]
  })

  it('新增合并置顶、重复丢弃、脏数据过滤', () => {
    const history = useHistoryStore()
    const valid = {
      id: 'imp-1',
      createdAt: '2026-09-03T10:00:00.000Z',
      question: { text: 'q', domain: 'love', timeframeMonths: 3 },
      spreadId: 'three-timeline',
      cards: [],
      deckSnapshot: [],
      cutIndex: 1,
      interpretation: { intro: '', positions: [], links: [], summary: null, closing: null },
    }
    expect(history.importReadings([valid, { bad: true }, null])).toBe(1)
    expect(history.get('imp-1')).toBeTruthy()
    expect(history.importReadings([valid])).toBe(0) // 已存在
    expect(history.importReadings('not-array')).toBe(0)
  })
})
