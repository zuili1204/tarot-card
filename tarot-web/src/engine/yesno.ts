// 是/否单抽（01 §3.5，N1）：抽 1 张 → 按牌的 yesNo 映射三档倾向 → 给出该牌的展开解释。
// 纪律：文案全部来自 data 层（rituals.yesNo + cards），引擎零硬编码。
// 逆位不改档位：01 §3.5 只定义了"按牌映射三档"，不擅自发明"逆位反转"规则，
// 只在解释层追加一句逆位提示——规则没定的东西，不替产品拍板。
import { cardMap, rituals } from '@/data'
import type { Card, YesNo } from '@/types'

export interface YesNoReading {
  /** 三档倾向：yes=倾向于是 / no=倾向于否 / vague=模糊待观察 */
  verdict: YesNo
  label: string
  note: string
  /** 逆位时为一句提示文案；正位为 null */
  reversedNote: string | null
  /** 该牌的展开解释（正逆位取对应 core） */
  detail: string
  keywords: string[]
  advice: string
  /** 开放式提问引导（01 §3.5 要求常驻） */
  guide: string
}

export function composeYesNo(cardId: string, reversed: boolean): YesNoReading | null {
  const card: Card | undefined = cardMap.get(cardId)
  if (!card) return null
  const t = rituals.yesNo
  const dir = reversed ? 'rev' : 'up'
  return {
    verdict: card.yesNo,
    label: t.verdict[card.yesNo],
    note: t.verdictNote[card.yesNo],
    reversedNote: reversed ? t.reversedNote : null,
    detail: card.core[dir],
    keywords: card.keywords[dir],
    advice: card.advice,
    guide: t.openHint,
  }
}
