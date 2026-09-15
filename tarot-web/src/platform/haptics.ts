// 触觉反馈（09 Q10）：洗牌达标 / 抽中 / 翻开 / 成阵四处
// 手感是塔罗产品的核心体验（03 §4.2 拟物细节好感来源），成本极低、收益最高的一项
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { isNative } from './index'

export type TapStyle = 'light' | 'medium' | 'heavy'

const IMPACT = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
}

/** 轻反馈：点选、切牌、翻牌 */
export async function tap(style: TapStyle = 'light'): Promise<void> {
  if (!isNative()) return
  try {
    await Haptics.impact({ style: IMPACT[style] })
  } catch {
    /* 设备无马达则忽略 */
  }
}

/** 仪式节点专用：洗牌达标、成阵完成（略强的确认感） */
export async function ritual(): Promise<void> {
  if (!isNative()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Medium })
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    /* 同上 */
  }
}
