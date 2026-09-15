// 克隆飞行工具（08 §4.4）：让"同一张牌"从当前屏幕位置连续飞到目标矩形。
// 纪律：克隆节点只动 transform（WAAPI）；onfinish 在页面隐藏时不触发 → 超时兜底竞速
export interface FlyRect {
  left: number
  top: number
  width: number
  height: number
}

/** 系统级减少动态效果：WAAPI 不受 CSS 全局降级约束，飞行类动画需手动跳过 */
export function reducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 克隆 el 置于其当前视觉位置（中心对齐，兼容已旋转元素——rect 是 AABB，克隆用布局尺寸居中），
 * WAAPI 补间飞向 to；resolve 后克隆移除，调用方负责显隐源/目标真身。
 */
export function flyCard(
  el: HTMLElement,
  to: FlyRect,
  opts: {
    rotateFrom?: number
    rotateTo?: number // 终点角度（横放位散落时 90°）
    duration?: number
    easing?: string
    zIndex?: number
  } = {},
): Promise<void> {
  const from = el.getBoundingClientRect()
  const w = el.offsetWidth || from.width
  const h = el.offsetHeight || from.height
  const clone = el.cloneNode(true) as HTMLElement
  clone.style.cssText = `position:fixed;left:${from.left + from.width / 2 - w / 2}px;top:${from.top + from.height / 2 - h / 2}px;width:${w}px;height:${h}px;margin:0;z-index:${opts.zIndex ?? 15};pointer-events:none;`
  document.body.appendChild(clone)

  const r0 = opts.rotateFrom ?? 0
  const r1 = opts.rotateTo ?? 0
  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)
  const scale = to.width / w
  const duration = opts.duration ?? 520
  const anim = clone.animate(
    [
      { transform: `translate(0, 0) rotate(${r0}deg) scale(1)` },
      { transform: `translate(${dx}px, ${dy}px) rotate(${r1}deg) scale(${scale})` },
    ],
    { duration, easing: opts.easing ?? 'cubic-bezier(0.22, 0.61, 0.36, 1)' },
  )
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      try {
        anim.cancel()
      } catch {
        /* 已结束 */
      }
      clone.remove()
      resolve()
    }
    anim.onfinish = finish
    setTimeout(finish, duration + 400) // 兜底：切后台 onfinish 不触发，防流程卡死
  })
}
