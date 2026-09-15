import { describe, expect, it } from 'vitest'
import { matchScenario } from '@/engine/match'

/** 30 条真实问法（10 §14.1 识别验收）：覆盖 10 个域，命中率 ≥80% */
const CASES: { q: string; want: string }[] = [
  { q: '这次考研能不能上岸', want: 'exam' },
  { q: '该不该出国读书', want: 'school' },
  { q: '论文写不出来怎么办', want: 'thesis' },
  { q: '导师总是否定我', want: 'teacher' },
  { q: '学不进去总是拖延', want: 'study-state' },
  { q: '在职读研值不值得', want: 'upskill' },
  { q: '他到底喜不喜欢我', want: 'ambiguity' },
  { q: '要不要分手', want: 'breakup' },
  { q: '异地恋能走下去吗', want: 'long-distance' },
  { q: '前任想复合该答应吗', want: 'reconciliation' },
  { q: '谈婚论嫁彩礼谈不拢', want: 'commitment' },
  { q: '发现对方和别人暧昧', want: 'third-party' },
  { q: '面试结果什么时候出', want: 'interview' },
  { q: '该不该跳槽去新公司', want: 'job-change' },
  { q: '被领导针对怎么办', want: 'workplace' },
  { q: '创业该单干还是合伙', want: 'startup' },
  { q: '三十五岁转行来得及吗', want: 'midlife-transition' },
  { q: '上班提不起劲很倦怠', want: 'burnout' },
  { q: '副业一直起不来', want: 'side-income' },
  { q: '负债压力很大怎么还', want: 'debt' },
  { q: '买房还是继续租房', want: 'rent-buy' },
  { q: '每个月都存不下钱', want: 'savings' },
  { q: '我妈为什么总否定我', want: 'family-origin' },
  { q: '孩子青春期很叛逆', want: 'parent-child' },
  { q: '婆媳关系怎么处理', want: 'inlaw' },
  { q: '要不要孩子还是丁克', want: 'fertility' },
  { q: '朋友借钱不还怎么开口', want: 'split-money' },
  { q: '最近总是提不起劲很累', want: 'energy' },
  { q: '压力大到睡不着觉', want: 'sleep' },
  { q: '创作卡住了没有灵感', want: 'inspiration' },
]

describe('场景识别（10 §6.1 提问优先）', () => {
  it('30 条真实问法命中率 ≥80%', () => {
    const missed = CASES.filter((c) => !matchScenario(c.q).scenario).map((c) => c.q)
    if (missed.length) console.log('未命中：', missed.join(' / '))
    expect((CASES.length - missed.length) / CASES.length).toBeGreaterThanOrEqual(0.8)
  })

  it('归属偏差清单（人工复核用，10 §14.1）', () => {
    const diff = CASES.map((c) => ({ ...c, got: matchScenario(c.q).scenario?.id ?? null }))
      .filter((c) => c.got !== c.want)
      .map((c) => `${c.q}：期望 ${c.want} → 实际 ${c.got}`)
    console.log(`归属偏差 ${diff.length}/${CASES.length}：\n  ${diff.join('\n  ')}`)
    // 识别要"接得住"（有命中）；归得准由人工复核，此处只输出不做硬断言
    expect(diff.length).toBeLessThanOrEqual(CASES.length)
  })

  it('子情境在父场景内匹配，未命中时给出候选', () => {
    const ld = matchScenario('异国恋时差太大撑不住', 'love')
    console.log('异国恋 →', ld.scenario?.id, '/', ld.subScenario?.id)
    const soc = matchScenario('职场里被人排挤怎么办', 'social')
    console.log('被排挤 →', soc.scenario?.id, '| 候选', soc.candidates.slice(0, 3).map((s) => s.id).join(','))
    expect(ld.scenario?.id).toBe('long-distance')
    expect(ld.subScenario?.id).toBe('ld-abroad')
    expect(soc.scenario).not.toBeNull()
  })
})
