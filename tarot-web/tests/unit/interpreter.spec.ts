// 组装引擎单测（04 §8.1）：三张阵 + 指定牌 → 3 单牌段 + 2 关联段 + 四件套 + 收束语
import { describe, expect, it } from 'vitest'
import { cardMap, scenarioTexts, spreadMap } from '@/data'
import { soften } from '@/engine/compliance'
import { composeReading } from '@/engine/interpreter'
import type { DrawnCard, Question } from '@/types'

const spread = spreadMap.get('three-timeline')!

const question: Question = {
  text: '这段感情要不要继续',
  domain: 'love',
  timeframeMonths: 3,
  scenarioId: 'breakup',
}

/** 固定牌面：位1 愚人(正) / 位2 圣杯三(逆) / 位3 宝剑十(正) */
const drawn: DrawnCard[] = [
  { cardId: 'major-0', reversed: false, positionNo: 1 },
  { cardId: 'cups-3', reversed: true, positionNo: 2 },
  { cardId: 'swords-10', reversed: false, positionNo: 3 },
]

describe('composeReading', () => {
  const r = composeReading({ question, spread, cards: drawn })

  it('开场 = 场景 intro（命中 breakup）', () => {
    expect(r.intro).toContain('去留之间反复拉扯')
  })

  it('3 个单牌段：L3 场景文案命中 + 位置模板 intro/callback 包裹', () => {
    expect(r.positions).toHaveLength(3)
    const [p1, p2, p3] = r.positions
    // L3：场景文案正文被完整包含
    expect(p1.text).toContain(scenarioTexts.breakup.cards['major-0'].up)
    expect(p2.text).toContain(scenarioTexts.breakup.cards['cups-3'].rev)
    expect(p3.text).toContain(scenarioTexts.breakup.cards['swords-10'].up)
    // 模板 intro 包裹（含牌名与逆位标）
    expect(p1.text).toContain('愚人')
    expect(p2.text).toContain('圣杯 3')
    expect(p2.text).toContain('（逆位）')
    expect(p3.text).toContain('宝剑 10')
    // 变体：逆位/苦牌 → soft；愚人正位按 yesNo 定
    expect(p2.variant).toBe('soft')
    expect(p3.variant).toBe('soft') // 宝剑十是苦牌
    expect(['direct', 'neutral']).toContain(p1.variant)
  })

  it('2 个关联段：首段 pairIntro / 次段 pairIntroMild；major-cups 与中性组 cups-swords 都有文案', () => {
    expect(r.links).toHaveLength(2)
    const [l1, l2] = r.links
    expect(l1.text).toContain('过去')
    expect(l1.text).toContain('现在')
    expect(l1.label).toBe('命运之水') // major-0 × cups-3
    expect(l2.label).toBe('水风各行') // cups × swords（新增中性组）
    expect(l1.text.length).toBeGreaterThan(20)
    expect(l2.text.length).toBeGreaterThan(20)
  })

  it('四件套：2/3 正位→顺流；1 张大牌→few；杯剑各 1→balanced；建议聚合 3 条', () => {
    const s = r.summary
    expect(s.trendLabel).toBe('整体顺流')
    expect(s.trendText).toContain('3个月')
    expect(s.trendText).not.toContain('个月个月') // 占位符叠词回归（2026-09-04）
    expect(s.majorText).toContain('大阿卡纳偶有出现')
    expect(s.elementText).toContain('四花色分布均匀')
    expect(s.actions).toHaveLength(3)
    expect(s.actionLead).toBe('牌面给出的行动建议，按重要程度排列：')
  })

  it('收束语 = scenarioClosing.breakup', () => {
    expect(r.closing).toContain('牌面不替你做决定')
  })
})

describe('composeReading 降级', () => {
  it('无场景：开场走 generic，正文降 L2 三域牌义', () => {
    const q: Question = { text: '随便问问', domain: 'career', timeframeMonths: 1 }
    const r = composeReading({ question: q, spread, cards: drawn })
    expect(r.intro).not.toContain('去留之间')
    expect(r.closing).toBeNull()
    const p1 = r.positions[0]
    expect(p1.text).toContain(cardMap.get('major-0')!.domains.career.up)
  })
})

describe('compliance soften', () => {
  it('确定性预言词被替换为倾向式（长词优先不误伤）', () => {
    expect(soften('这段关系命中注定会开花')).toBe('这段关系倾向于会开花')
    expect(soften('你一定会遇到转机')).toBe('你很可能遇到转机')
  })
})
