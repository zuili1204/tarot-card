// 是/否单抽（01 §3.5 / 09 N1）
import { describe, expect, it } from 'vitest'
import { cards } from '@/data'
import { composeYesNo } from '@/engine/yesno'

describe('是/否单抽：倾向映射', () => {
  it('78 张牌的档位与 cards.json 的 yesNo 完全一致', () => {
    expect(cards.length).toBe(78)
    for (const c of cards) {
      expect(composeYesNo(c.id, false)?.verdict).toBe(c.yesNo)
    }
  })

  it('三档标签与说明文案齐全', () => {
    for (const c of cards) {
      const r = composeYesNo(c.id, false)!
      expect(r.label).toBeTruthy()
      expect(r.note).toBeTruthy()
    }
  })

  it('逆位不改档位，只追加逆位提示', () => {
    for (const c of cards.slice(0, 20)) {
      const up = composeYesNo(c.id, false)!
      const rev = composeYesNo(c.id, true)!
      expect(rev.verdict).toBe(up.verdict) // 档位不变
      expect(up.reversedNote).toBeNull()
      expect(rev.reversedNote).toBeTruthy()
    }
  })

  it('展开解释随正逆位取对应 core', () => {
    const c = cards[0]
    expect(composeYesNo(c.id, false)!.detail).toBe(c.core.up)
    expect(composeYesNo(c.id, true)!.detail).toBe(c.core.rev)
  })

  it('未知牌 id 返回 null', () => {
    expect(composeYesNo('not-a-card', false)).toBeNull()
  })

  it('引导语常驻（01 §3.5：必须把用户引向开放式提问）', () => {
    expect(composeYesNo(cards[0].id, false)!.guide).toContain('开放式')
  })
})
