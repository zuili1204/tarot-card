// 音效（P1，05 §6.2 / 04 §1）：Web Audio 实时合成，零素材、零体积、零版权风险。
// 五段：洗牌摩擦 / 切牌 / 翻牌 / 成阵 / 结果氛围。
// 为什么合成而不是下载 CC0 素材：洗牌与翻牌本质是噪声包络，合成完全够用；
// 引入音频文件要额外的体积、版权留档与加载失败状态（08 §二"零新增资产"同一纪律）。
//
// ⚠️ 2026-09-13 修一个真实缺陷：`unlockAudio()` 与 play* 系列**必须是异步的**。
//   AudioContext 首次创建常处于 'suspended'，而 `resume()` 是异步的；旧实现在同一 tick 内
//   就 schedule 节点，此时 currentTime 不前进，声音被静默丢弃——表现就是"打开音效开关没反应"。
//   现在统一 await resume() 之后再调度，首次点击即可出声。
let ctx: AudioContext | null = null

/** 取（必要时创建并唤醒）AudioContext；唤醒失败仍返回实例，由调用方决定是否发声 */
async function ac(): Promise<AudioContext | null> {
  if (!ctx) {
    if (typeof window === 'undefined') return null
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    try {
      ctx = new Ctor()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      /* 保持 suspended，交给调用方兜底 */
    }
  }
  return ctx
}

/**
 * 首次用户手势时调用：解锁 AudioContext（iOS/Chrome 自动播放策略）。
 * @returns 是否真的可以发声——false 表示这台设备/环境当前播不出声音。
 */
export async function unlockAudio(): Promise<boolean> {
  const c = await ac()
  return !!c && c.state === 'running'
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * seconds))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}

/** 洗牌：6 次短促摩擦（带通 1.6kHz），约 1.1s */
export async function playShuffle(): Promise<void> {
  const c = await ac()
  if (!c) return
  const t0 = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, 1.2)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1600
  bp.Q.value = 0.9
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  for (let i = 0; i < 6; i++) {
    const t = t0 + i * 0.17
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13)
  }
  src.connect(bp).connect(g).connect(c.destination)
  src.start(t0)
  src.stop(t0 + 1.2)
}

/** 翻牌：一次气流 whoosh，低通 6k→600Hz，约 0.26s */
export async function playFlip(): Promise<void> {
  const c = await ac()
  if (!c) return
  const t0 = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, 0.3)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(6000, t0)
  lp.frequency.exponentialRampToValueAtTime(600, t0 + 0.22)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26)
  src.connect(lp).connect(g).connect(c.destination)
  src.start(t0)
  src.stop(t0 + 0.3)
}

/** 切牌：一次更短更轻的气流（约 0.17s），与翻牌区分开（09 N6） */
export async function playCut(): Promise<void> {
  const c = await ac()
  if (!c) return
  const t0 = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, 0.2)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(5200, t0)
  lp.frequency.exponentialRampToValueAtTime(900, t0 + 0.14)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17)
  src.connect(lp).connect(g).connect(c.destination)
  src.start(t0)
  src.stop(t0 + 0.2)
}

/** 成阵：一记温和上行（220→440Hz）+ 缓慢收束，约 0.5s（09 N6） */
export async function playGather(): Promise<void> {
  const c = await ac()
  if (!c) return
  const t0 = c.currentTime
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(220, t0)
  o.frequency.exponentialRampToValueAtTime(440, t0 + 0.42)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.08)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5)
  o.connect(g).connect(c.destination)
  o.start(t0)
  o.stop(t0 + 0.52)
}

/** 结果氛围：G3/D4/G4 空五度和声，错峰淡入淡出约 2s */
export async function playReveal(): Promise<void> {
  const c = await ac()
  if (!c) return
  const t0 = c.currentTime
  ;[196, 294, 392].forEach((f, i) => {
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const g = c.createGain()
    const start = t0 + i * 0.12
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(0.045, start + 0.5)
    g.gain.exponentialRampToValueAtTime(0.0001, start + 2)
    o.connect(g).connect(c.destination)
    o.start(start)
    o.stop(start + 2.1)
  })
}
