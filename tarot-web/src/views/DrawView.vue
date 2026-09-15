<script setup lang="ts">
// S2-3 抽牌页（04 §5 五步仪式链前三步）：长按洗牌 ≥2s → 切牌三选一 → 扇形 180° 抽牌
// 性能纪律：只动 transform/opacity；松手刻才 shuffle 固化排列（仪式动作与真实随机同刻发生）
// 动效升级（08 §四）：抽中牌 FLIP 克隆飞入托盘，抽满聚拢成阵转场（方案 B）
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { cardMap, cards, rituals, spreadMap } from '@/data'
import { createDraw, shuffleDeck } from '@/engine/shuffle'
import { composeReading } from '@/engine/interpreter'
import { useReadingStore } from '@/stores/reading'
import { useSettingsStore } from '@/stores/settings'
import { useTaskStore } from '@/stores/task'
import CardBack from '@/components/CardBack.vue'
import { flyCard, reducedMotion } from '@/utils/flip'
import { ritual, tap } from '@/platform/haptics'
import { playCut, playFlip, playGather, playShuffle } from '@/platform/sound'
import type { DrawnCard } from '@/types'

const router = useRouter()
const readingStore = useReadingStore()
const settingsStore = useSettingsStore()
const taskStore = useTaskStore()

const HOLD_MS = 2000
const CARD_IDS = cards.map((c) => c.id)

const spread = computed(() =>
  readingStore.spreadId ? spreadMap.get(readingStore.spreadId) : undefined,
)

onMounted(() => {
  // 双保险恢复：question+spreadId 在，洗牌产物不在 → 回到洗牌重抽（不静默重放）
  if (!readingStore.question || !spread.value) router.replace(readingStore.question ? '/spread' : '/ask')
})

/* ---------- 阶段一：长按洗牌 ---------- */
const stage = ref<'shuffle' | 'cut' | 'flourish' | 'fan'>('shuffle')
const holding = ref(false)
const holdProgress = ref(0) // 0-1
const shuffleDone = ref(false) // 松手达标：squash + 金尘 + 星尘增亮
let holdTimer: ReturnType<typeof setInterval> | null = null
let holdStart = 0

/* 洗牌蓄力星空（sky-charge）：仅洗牌 stage 挂 body——蓄力流星解禁、蓄力星淡入、
   星尘增亮；--charge 随蓄力进度同步（Backdrop 取用），松手达标接既有 sky-flare */
watch(
  stage,
  (s) => {
    document.body.classList.toggle('sky-charge', s === 'shuffle')
    if (s !== 'shuffle') document.body.style.removeProperty('--charge')
  },
  { immediate: true },
)
watch(holdProgress, (v) => document.body.style.setProperty('--charge', v.toFixed(3)))

/* 蓄力响应（08 §4.1）：牌堆本体随进度拱起，riffle 摆幅同源放大（--amp 供 keyframes 取用） */
const deckStyle = computed(() =>
  holding.value
    ? {
        transform: `scale(${(1 + holdProgress.value * 0.04).toFixed(3)})`,
        '--amp': String((0.3 + holdProgress.value * 0.7).toFixed(2)),
      }
    : undefined,
)

const shuffleTip = computed(() => {
  if (holding.value && holdProgress.value < 1) return rituals.shuffle.shuffling
  if (holding.value) return rituals.shuffle.enough
  return readingStore.deckSnapshot ? rituals.shuffle.done : rituals.shuffle.ready
})

function startHold() {
  if (stage.value !== 'shuffle' || holding.value || shuffleDone.value) return
  holding.value = true
  holdStart = Date.now()
  holdProgress.value = 0
  // 摩擦声随长按起（P1 音效，默认关闭）
  if (settingsStore.state.sound) playShuffle()
  holdTimer = setInterval(() => {
    holdProgress.value = Math.min(1, (Date.now() - holdStart) / HOLD_MS)
    if (holdProgress.value >= 1 && holdTimer) {
      clearInterval(holdTimer)
      holdTimer = null
    }
  }, 50)
}

function endHold() {
  if (stage.value !== 'shuffle' || !holding.value) return
  holding.value = false
  if (holdTimer) {
    clearInterval(holdTimer)
    holdTimer = null
  }
  if (Date.now() - holdStart >= HOLD_MS) {
    // 松手刻固化排列与位相；先播完成仪式（squash+金尘+星尘增亮）再进切牌
    const { deckSnapshot, orientation } = shuffleDeck(CARD_IDS)
    readingStore.setShuffleResult(deckSnapshot, orientation)
    shuffleDone.value = true
    void ritual() // 洗牌达标：触觉确认（09 Q10）
    if (settingsStore.state.sound) playFlip()
    document.body.classList.add('sky-flare')
    setTimeout(() => {
      document.body.classList.remove('sky-flare')
      shuffleDone.value = false
      stage.value = 'cut'
    }, 460)
  } else {
    holdProgress.value = 0
  }
}

/* ---------- 阶段二：切牌三选一 ---------- */
const cutting = ref(false)
const chosenPile = ref(0) // 0=未选

function cut(i: 1 | 2 | 3) {
  if (stage.value !== 'cut' || cutting.value) return
  cutting.value = true
  chosenPile.value = i
  void tap('light')
  // 切牌用更短更轻的气流声，与翻牌区分开（09 N6）
  if (settingsStore.state.sound) playCut()
  readingStore.setCut(i)
  // 08 §4.2：未选两摞坠落淡出 → 480ms 后选中摞飞中央、幻影两展两收，再进拱桥抽牌
  setTimeout(() => {
    cutting.value = false
    if (reducedMotion()) {
      stage.value = 'fan'
      return
    }
    stage.value = 'flourish'
    runFlourish()
  }, 480)
}

/* ---------- 阶段 2.5：幻影仪式（虚数展示，非真牌数） ----------
   选中摞飞中央 → 16 张虚数环绽开→收 → 16 张虚数斜带（右上→左下）绽开→收（尾部与拱桥展开交叠）→ 拱桥。
   幻影是氛围样本：洗过的牌任意子集等价随机，真牌到最后拱桥才登场。 */
const flourishPose = ref<'' | 'ring' | 'ringOut' | 'diag' | 'diagOut'>('')
let flourishTimers: ReturnType<typeof setTimeout>[] = []

const PHANTOM_N = 16
const phantoms = Array.from({ length: PHANTOM_N }, (_, i) => {
  const phi = i * (360 / PHANTOM_N)
  const rad = (phi * Math.PI) / 180
  const R = 1.42 // rem 环半径
  const half = 1.5 // rem 斜带半长（右上→左下）
  const t = i / (PHANTOM_N - 1)
  return {
    i,
    style: {
      '--i': i,
      '--rx': `${(R * Math.sin(rad)).toFixed(3)}rem`,
      '--ry': `${(-R * Math.cos(rad)).toFixed(3)}rem`,
      '--rr': `${phi + 90}deg`, // 牌沿切线（牌背 180° 对称）
      '--dx': `${(half - t * 2 * half).toFixed(3)}rem`,
      '--dy': `${(-half + t * 2 * half).toFixed(3)}rem`,
      '--dr': '45deg',
    } as Record<string, string | number>,
  }
})

function runFlourish() {
  flourishPose.value = ''
  flourishTimers.forEach(clearTimeout)
  flourishTimers = []
  const at = (ms: number, fn: () => void) => flourishTimers.push(setTimeout(fn, ms))
  at(440, () => (flourishPose.value = 'ring')) // 中心摞 420ms 飞抵后绽环（级联 12ms）
  at(1300, () => (flourishPose.value = 'ringOut')) // 绽 620+级联 168，全开后稍停
  at(1700, () => (flourishPose.value = 'diag')) // 收 400
  at(2500, () => (flourishPose.value = 'diagOut')) // 绽 620+级联 168
  at(2700, () => {
    stage.value = 'fan' // 拱桥从中心捻开，与幻影收尾（至 2900）交叠 ~200ms
  })
  at(2950, () => (flourishPose.value = ''))
}

/* ---------- 阶段三：拱桥抽牌 ---------- */
const picked = ref<number[]>([]) // 拱桥下标（点选顺序即位置序）
const flying = ref(false) // 单张飞行中（防连点导致 rect 错乱）
const gathering = ref(false) // 成阵聚拢中（禁一切交互）

// 拱桥几何：36 张大半径浅弧、牌沿切线微旋。弦 2.9rem 按牌体算（端牌旋 ~34° 后
// 水平半宽 ~45px，390 屏两侧留边后牌角不出屏）；矢 0.45rem（拱度 ~15%）。
// 78→36：390 屏宽下 78 张每张可见仅 ~4.8px 松不开；36 张可见 ~8.6px。
// 洗过的牌任意子集等价随机，供给远超最大阵（凯尔特 10 张）。
const FAN_N = 36
const CHORD = 2.9
const SAG = 0.45
const bridgeR = ((CHORD * CHORD) / 4 + SAG * SAG) / (2 * SAG)
const fanAngles = Array.from({ length: FAN_N }, (_, i) => {
  const t = i / (FAN_N - 1)
  const halfTheta = Math.asin(CHORD / 2 / bridgeR)
  const phi = -halfTheta + t * 2 * halfTheta
  return {
    a: (phi * 180) / Math.PI, // 牌沿切线的旋转角（±~27°）
    tx: `${(bridgeR * Math.sin(phi)).toFixed(3)}rem`,
    ty: `${(bridgeR - SAG - bridgeR * Math.cos(phi)).toFixed(3)}rem`,
    delay: `${Math.round(Math.abs(i - (FAN_N - 1) / 2) * 9)}ms`,
  }
})

// 扇面元素收集（点选时取源矩形用）
const fanEls = new Map<number, HTMLElement>()
function setFanEl(i: number, el: unknown) {
  if (el) fanEls.set(i, el as HTMLElement)
  else fanEls.delete(i)
}

const drawTip = computed(() => {
  const total = spread.value?.cardCount ?? 1
  const n = picked.value.length
  if (n === 0) return rituals.draw.ready.replace('{n}', String(total))
  if (n >= total) return rituals.draw.done
  if (n === total - 1) return rituals.draw.lastOne
  return rituals.draw.picked.replace('{n}', String(n)).replace('{total}', String(total))
})

// 托盘分行（静态预示）：行容量 5、尽量均分、行内居中——空槽一开始就按最终分行画好，
// 每张牌飞固定槽位（3→1×3，5→1×5，6→3+3，7→4+3，10→5+5）
const trayRows = computed<number[]>(() => {
  const total = spread.value?.cardCount ?? 1
  if (total <= 5) return [total]
  const rows = Math.ceil(total / 5)
  const base = Math.floor(total / rows)
  const extra = total % rows
  return Array.from({ length: rows }, (_, r) => base + (r < extra ? 1 : 0))
})
function rowStart(r: number) {
  return trayRows.value.slice(0, r).reduce((a, b) => a + b, 0)
}

async function pickFan(i: number) {
  if (stage.value !== 'fan' || picked.value.includes(i) || flying.value || gathering.value) return
  if (!spread.value || !readingStore.deckSnapshot || !readingStore.orientation || !readingStore.cutIndex) return
  picked.value.push(i)
  void tap('light') // 抽中：轻反馈（03 §4.2 拟物手感）
  const total = spread.value.cardCount

  // 抽满：点选顺序 = 位置序，产文即快照（数据时机不因动画延后）
  if (picked.value.length >= total) {
    const outcome = createDraw(readingStore.deckSnapshot, readingStore.orientation, readingStore.cutIndex)
    const allowReversed = settingsStore.state.reversed
    const drawn: DrawnCard[] = picked.value.map((fanIndex, k) => ({
      ...outcome.pickAt(fanIndex, allowReversed),
      positionNo: k + 1,
    }))
    readingStore.setDrawn(drawn)
    readingStore.setInterpretation(
      composeReading({ question: readingStore.question!, spread: spread.value, cards: drawn }),
    )
  }

  // 牌的旅程②（08 §4.4）：克隆从扇面飞入托盘；无元素兜底=直接落托盘
  const target = await revealTrayItem(i)
  if (picked.value.length >= total && target) await gatherAndGo()
  else if (picked.value.length >= total) router.push('/result')
}

/** 渲染托盘新格并等飞行落定；返回目标元素（无飞行时立即显示） */
async function revealTrayItem(i: number) {
  await nextTick()
  const items = document.querySelectorAll<HTMLElement>('.tray-item')
  const target = items[items.length - 1]
  if (!target) return null
  const backEl = fanEls.get(i)?.querySelector('.back') as HTMLElement | null
  if (!backEl || reducedMotion()) return target
  target.classList.add('incoming') // 藏真身，等克隆落定
  flying.value = true
  await flyCard(backEl, target.getBoundingClientRect(), { rotateFrom: fanAngles[i].a })
  target.classList.remove('incoming')
  target.classList.add('landed') // B2：落定微弹（settle），给"落进托盘"一个分量
  flying.value = false
  return target
}

/** 成阵转场（08 §4.5 方案 B）：托盘牌聚拢居中 → 星尘增亮 → 转场，结果页"散开成阵"接续 */
async function gatherAndGo() {
  if (reducedMotion()) {
    router.push('/result')
    return
  }
  gathering.value = true
  void tap('heavy') // 抽满：比点选更重的确认感（09 N6）
  if (settingsStore.state.sound) playGather()
  await nextTick()
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const unit = remPx()
  const flights = [...document.querySelectorAll<HTMLElement>('.tray-item')].map((el, k) => {
    const back = el.querySelector('.back') as HTMLElement | null
    if (!back) return Promise.resolve()
    el.style.opacity = '0' // 真身让位给克隆
    return new Promise<void>((resolve) => {
      setTimeout(
        () =>
          resolve(
            flyCard(
              back,
              { left: cx - 0.25 * unit, top: cy - 0.43 * unit, width: 0.5 * unit, height: 0.86 * unit },
              { duration: 700, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
            ),
          ),
        k * 70,
      )
    })
  })
  await Promise.all(flights)
  document.body.classList.add('sky-flare')
  await new Promise((r) => setTimeout(r, 520))
  router.push('/result')
}

function remPx(): number {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 100
}

onUnmounted(() => {
  document.body.classList.remove('sky-flare')
  document.body.classList.remove('sky-charge')
  document.body.style.removeProperty('--charge')
  if (holdTimer) {
    clearInterval(holdTimer)
    holdTimer = null
  }
  flourishTimers.forEach(clearTimeout)
  flourishTimers = []
})

function pickedCardId(i: number): string | undefined {
  const d = readingStore.drawnCards
  const k = picked.value.indexOf(i)
  return k >= 0 && d ? cardMap.get(d[k].cardId)?.nameZh : undefined
}

/* ---------- 首次进入的三步提示（07 §1.3，仅首次） ---------- */
const showTips = computed(() => !taskStore.sawDrawTips)
const tipLines = computed(() => [
  `① ${rituals.shuffle.ready}`,
  `② ${rituals.cut.ready}`,
  `③ ${rituals.draw.ready.replace('{n}', String(spread.value?.cardCount ?? 3))}`,
])
</script>

<template>
  <div class="page draw" :class="`stage-${stage}`">
    <header class="head">
      <h1>{{ spread?.nameZh }}</h1>
    </header>

    <!-- 洗牌 -->
    <section v-if="stage === 'shuffle'" class="stage s-shuffle">
      <div
        class="deck"
        :class="{ holding, done: shuffleDone }"
        :style="deckStyle"
        @pointerdown.prevent="startHold"
        @pointerup.prevent="endHold"
        @pointerleave="endHold"
      >
        <div
          v-for="k in 10"
          :key="k"
          class="deck-card"
          :class="k <= 5 ? 'left' : 'right'"
          :style="{ '--k': (k - 1) % 5 }"
        >
          <CardBack />
        </div>
        <span
          v-for="s in 7"
          :key="`sp${s}`"
          class="spark"
          :style="{ '--s': s - 1, '--sx': [-1, -0.6, -0.25, 0.25, 0.6, 1, 0.15][s - 1] }"
        />
      </div>
      <div class="hold-bar"><div class="hold-fill" :style="{ transform: `scaleX(${holdProgress})` }" /></div>
      <p class="tip">{{ shuffleTip }}</p>
      <p class="hint">按住牌堆，保持两秒以上</p>
    </section>

    <!-- 切牌 -->
    <section v-else-if="stage === 'cut'" class="stage s-cut">
      <p class="tip">{{ rituals.cut.ready }}</p>
      <p class="hint">{{ rituals.cut.hint }}</p>
      <div class="piles">
        <button
          v-for="i in 3"
          :key="i"
          type="button"
          class="pile"
          :class="{ chosen: chosenPile === i, dropped: cutting && chosenPile !== i }"
          :style="{ '--p': i - 1 }"
          @click="cut(i as 1 | 2 | 3)"
        >
          <div class="pile-stack">
            <div v-for="k in 4" :key="k" class="pile-card" :style="{ '--k': k - 1 }">
              <CardBack />
            </div>
          </div>
          <span class="pile-label">{{ ['上', '中', '下'][i - 1] }}摞</span>
        </button>
      </div>
    </section>

    <!-- 幻影仪式：选中摞飞中央；幻影层独立于 stage（page 级 fixed），收尾可与拱桥展开交叠 -->
    <section v-else-if="stage === 'flourish'" class="stage s-flourish">
      <div class="flourish-stage">
        <div class="center-pile" :style="{ '--ox': ['', '-0.82rem', '0rem', '0.82rem'][chosenPile] }">
          <div v-for="k in 4" :key="k" class="pile-card" :style="{ '--k': k - 1 }">
            <CardBack />
          </div>
        </div>
      </div>
    </section>

    <!-- 拱桥抽牌：托盘（分行）在拱桥上方——抽中的牌向上飞入；未抽时空槽按最终分行预示总量 -->
    <section v-else class="stage s-fan" :class="{ gathering }">
      <p class="tip">{{ drawTip }}</p>
      <div class="tray" :class="{ multi: trayRows.length > 1 }">
        <div v-for="(row, r) in trayRows" :key="r" class="tray-row">
          <template v-for="k in row" :key="rowStart(r) + k">
            <span v-if="rowStart(r) + k - 1 < picked.length" class="tray-item">
              <CardBack />
              <i v-if="pickedCardId(picked[rowStart(r) + k - 1])" class="tray-name">{{ pickedCardId(picked[rowStart(r) + k - 1]) }}</i>
              <i class="tray-no">{{ rowStart(r) + k }}</i>
            </span>
            <i v-else class="tray-slot-mark" aria-hidden="true" />
          </template>
        </div>
      </div>
      <div class="fan-area">
        <div class="fan">
          <button
            v-for="(f, i) in fanAngles"
            :key="i"
            :ref="(el) => setFanEl(i, el)"
            type="button"
            class="fan-slot"
            :class="{ picked: picked.includes(i) }"
            :style="{ '--tx': f.tx, '--ty': f.ty, '--tr': `${f.a}deg`, '--fd': f.delay }"
            :aria-label="`抽第 ${i + 1} 张`"
            @click="pickFan(i)"
          >
            <CardBack />
          </button>
        </div>
      </div>
    </section>

    <!-- 首次进入：三步小提示（sawDrawTips 控制仅一次） -->
    <div v-if="showTips" class="tips-mask" @click.self="taskStore.markTipsSeen()">
      <div class="tips-card">
        <h2>抽牌三步</h2>
        <p v-for="(t, i) in tipLines" :key="i" class="tips-line">{{ t }}</p>
        <button type="button" class="tips-btn" @click="taskStore.markTipsSeen()">知道了，开始</button>
      </div>
    </div>

    <!-- L4 仪式聚焦（08 §五）：抽牌全程四角压暗，淡入随路由转场 -->
    <div class="vignette" aria-hidden="true"></div>

    <!-- 幻影层（page 级 fixed）：环/斜带虚数展示，独立于 stage 存活以衔接拱桥展开 -->
    <div class="phantom-layer" :class="flourishPose" aria-hidden="true">
      <div v-for="p in phantoms" :key="p.i" class="phantom-card" :style="p.style">
        <CardBack />
      </div>
    </div>
  </div>
</template>

<style scoped>
.draw {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding-bottom: calc(0.2rem + var(--safe-bottom));
}
.head {
  padding-top: calc(0.06rem + var(--safe-top));
}
h1 {
  font-size: 0.17rem;
  text-align: center;
}
.stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.14rem;
}
/* 首次三步提示气泡 */
.tips-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.66);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}
.tips-card {
  width: min(80%, 3rem);
  background: var(--panel);
  border: 1px solid var(--gold-dim);
  border-radius: var(--radius);
  padding: 0.2rem 0.18rem;
}
.tips-card h2 {
  font-size: 0.15rem;
  text-align: center;
  margin-bottom: 0.12rem;
}
.tips-line {
  font-size: 0.11rem;
  color: var(--text-2);
  line-height: 1.8;
  margin-bottom: 0.06rem;
}
.tips-btn {
  display: block;
  width: 100%;
  margin-top: 0.14rem;
  font-size: 0.13rem;
  color: #14101f;
  background: linear-gradient(160deg, var(--gold-bright), var(--gold));
  border-radius: 999px;
  padding: 0.09rem 0;
}
.tip {
  color: var(--text);
  font-size: 0.14rem;
  text-align: center;
}
.hint {
  color: var(--text-3);
  font-size: 0.1rem;
}

/* L4 仪式聚焦：压暗四角让牌面成为唯一光源（pointer-events 穿透，z 低于提示弹窗） */
.vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  background: radial-gradient(78% 60% at 50% 46%, transparent 55%, rgba(4, 3, 8, 0.5) 100%);
}

/* 洗牌（08 §4.1）：鸽尾式 riffle——左右两组（5+5）交错合拢再弹开；
   待机时整堆缓慢悬浮；蓄力时摆幅 --amp 随进度放大、整堆拱起（--amp/transform 由 deckStyle 绑定） */
.deck {
  position: relative;
  width: 0.95rem;
  height: calc(0.95rem * 12 / 7); /* 容器高=牌背真实高（7/12 比例），防溢出盖住进度条/提示 */
  cursor: pointer;
  touch-action: none;
  user-select: none;
  animation: floatBob 3s ease-in-out infinite alternate;
  transition: filter 0.35s ease;
}
.deck.holding {
  animation: none;
  filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.4));
}
.deck-card {
  position: absolute;
  inset: 0;
}
.deck-card.left {
  transform-origin: 8% 92%;
}
.deck-card.right {
  transform-origin: 92% 92%;
}
.deck-card :deep(.back) {
  width: 100%;
}
.deck.holding .deck-card.left {
  animation: riffleL 1.2s ease-in-out infinite;
  animation-delay: calc(var(--k) * 0.08s);
}
.deck.holding .deck-card.right {
  animation: riffleR 1.2s ease-in-out infinite;
  animation-delay: calc(var(--k) * 0.08s);
}
/* 左组抬起向左上、右组镜像：两组在对插位交错，像鸽尾洗牌 */
@keyframes riffleL {
  0%,
  100% {
    transform: rotate(0deg) translateX(0);
  }
  35% {
    transform: rotate(calc(var(--amp, 0.5) * -24deg)) translate(calc(var(--amp, 0.5) * -0.045rem)) translateY(calc(var(--amp, 0.5) * -0.03rem));
  }
  65% {
    transform: rotate(calc(var(--amp, 0.5) * 13deg)) translateY(calc(var(--amp, 0.5) * -0.045rem));
  }
}
@keyframes riffleR {
  0%,
  100% {
    transform: rotate(0deg) translateX(0);
  }
  35% {
    transform: rotate(calc(var(--amp, 0.5) * 24deg)) translate(calc(var(--amp, 0.5) * 0.045rem)) translateY(calc(var(--amp, 0.5) * -0.03rem));
  }
  65% {
    transform: rotate(calc(var(--amp, 0.5) * -13deg)) translateY(calc(var(--amp, 0.5) * -0.045rem));
  }
}
/* 松手达标：squash & stretch 微挤压 + 金尘飘散 + 辉光定格 */
.deck.done {
  animation: deckSquash 0.42s var(--ease-spring) both;
  filter: drop-shadow(0 0 26px rgba(212, 175, 55, 0.55));
}
@keyframes deckSquash {
  0% {
    transform: scale(1.04, 1);
  }
  40% {
    transform: scale(1.09, 0.92);
  }
  100% {
    transform: scale(1, 1);
  }
}
.spark {
  position: absolute;
  left: 50%;
  top: 42%;
  width: 0.03rem;
  height: 0.03rem;
  border-radius: 50%;
  background: var(--gold-bright);
  opacity: 0;
  pointer-events: none;
}
.deck.done .spark {
  animation: sparkFly 0.62s ease-out both;
  animation-delay: calc(var(--s) * 0.035s);
}
@keyframes sparkFly {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.6);
  }
  25% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(calc(var(--sx) * 0.34rem), -0.38rem) scale(1);
  }
}
.hold-bar {
  width: 60%;
  height: 3px;
  border-radius: 2px;
  background: var(--line);
  overflow: hidden;
}
.hold-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--gold), var(--gold-bright));
  transform-origin: left;
  transform: scaleX(0);
}

/* 切牌（08 §4.2）：选中摞上浮辉光，未选两摞坠落淡出 */
.piles {
  display: flex;
  gap: 0.22rem;
}
.pile {
  background: none;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.08rem;
  padding: 0.06rem;
  animation: popIn var(--dur-slow) var(--ease-spring) both;
  animation-delay: calc(var(--p, 0) * 0.09s);
}
.pile:active .pile-stack {
  transform: translateY(-0.06rem);
}
.pile-stack {
  position: relative;
  width: 0.6rem;
  height: calc(0.6rem * 12 / 7); /* 同 deck：容器包住牌背真实高，防溢出压 label */
  transition:
    transform var(--dur-base) var(--ease-out),
    filter var(--dur-base) ease;
}
.pile-card {
  position: absolute;
  inset: 0;
  transform: translateY(calc(var(--k) * -0.016rem));
}
.pile-card :deep(.back) {
  width: 100%;
}
.pile.chosen .pile-stack {
  transform: translateY(-0.06rem);
  filter: drop-shadow(0 0 14px rgba(212, 175, 55, 0.55));
}
.pile.dropped {
  animation: pileDrop var(--dur-base) var(--ease-out) both;
  pointer-events: none;
}
@keyframes pileDrop {
  to {
    opacity: 0;
    transform: translateY(0.32rem);
  }
}
.pile-label {
  color: var(--text-2);
  font-size: 0.11rem;
}

/* 幻影仪式（08 §4.2.5）：选中摞飞中央 → 虚数环/斜带两展两收（幻影层 page 级 fixed，
   独立于 stage 存活，收尾与拱桥展开交叠）。幻影牌为氛围虚数（非真牌数），
   带金晕、收拢时缩小渐隐——"幻影从摞中绽放又收回" */
.flourish-stage {
  position: relative;
  width: 100%;
  height: 4rem;
}
.center-pile {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0.6rem;
  height: calc(0.6rem * 12 / 7);
  margin: calc(-0.3rem * 12 / 7) 0 0 -0.3rem;
  animation: pileToCenter 0.42s var(--ease-spring) both;
}
@keyframes pileToCenter {
  from {
    transform: translate(var(--ox, 0rem), 0.12rem) scale(0.88);
    opacity: 0.5;
  }
  to {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
}
.phantom-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 6;
}
.phantom-card {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0.26rem;
  height: calc(0.26rem * 12 / 7);
  margin: calc(-0.13rem * 12 / 7) 0 0 -0.13rem;
  opacity: 0;
  pointer-events: none;
}
.phantom-card :deep(.back) {
  width: 100%;
  filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.35)); /* 幻影微光 */
}
.phantom-layer.ring .phantom-card {
  animation: phRing 0.62s var(--ease-spring) both;
  animation-delay: calc(var(--i) * 12ms);
}
.phantom-layer.ringOut .phantom-card {
  animation: phRingIn 0.4s var(--ease-out) both;
}
.phantom-layer.diag .phantom-card {
  animation: phDiag 0.62s var(--ease-spring) both;
  animation-delay: calc(var(--i) * 12ms);
}
.phantom-layer.diagOut .phantom-card {
  animation: phDiagIn 0.4s var(--ease-out) both;
}
@keyframes phRing {
  from {
    transform: translate(0, 0) rotate(0deg) scale(0.4);
    opacity: 0;
  }
  55% {
    opacity: 0.92;
  }
  to {
    transform: translate(var(--rx), var(--ry)) rotate(var(--rr)) scale(1);
    opacity: 0.92;
  }
}
@keyframes phRingIn {
  from {
    transform: translate(var(--rx), var(--ry)) rotate(var(--rr)) scale(1);
    opacity: 0.92;
  }
  to {
    transform: translate(0, 0) rotate(0deg) scale(0.35);
    opacity: 0;
  }
}
@keyframes phDiag {
  from {
    transform: translate(0, 0) rotate(0deg) scale(0.4);
    opacity: 0;
  }
  55% {
    opacity: 0.92;
  }
  to {
    transform: translate(var(--dx), var(--dy)) rotate(var(--dr)) scale(1);
    opacity: 0.92;
  }
}
@keyframes phDiagIn {
  from {
    transform: translate(var(--dx), var(--dy)) rotate(var(--dr)) scale(1);
    opacity: 0.92;
  }
  to {
    transform: translate(0, 0) rotate(0deg) scale(0.35);
    opacity: 0;
  }
}

/* 拱桥（08 §4.3 升级）：40 张大半径浅弧横贯屏内（弦 3.74rem、矢 0.45rem），
   牌沿切线微旋 ±27°；几何参数由 fanAngles 逐张算好注入 --tx/--ty/--tr。
   展开态 = 默认 transform，动画只定义收拢起始帧（backwards），播完回归默认值 → hover 接管 */
.fan-area {
  width: 100%;
  overflow: visible;
}
.fan,
.tip {
  transition: opacity var(--dur-base) ease; /* 聚拢时让位给成阵仪式 */
}
.s-fan.gathering .fan,
.s-fan.gathering .tip,
.s-fan.gathering .tray-name {
  opacity: 0;
}
.fan {
  position: relative;
  height: 1.8rem; /* 拱桥带：牌高 ~0.86rem + 矢 0.45rem + 余量 */
  margin: 0 auto;
  animation: fanBreath 0.55s var(--ease-out) 0.8s 1; /* 收束后整体呼吸一次，宣告"可以抽了" */
}
@keyframes fanBreath {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.012);
  }
}
.fan-slot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0.5rem;
  height: 1.4rem; /* 热区大于牌背 */
  margin-left: -0.25rem;
  margin-top: -0.7rem;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transform: translate(var(--tx), var(--ty)) rotate(var(--tr, 0deg));
  transition: transform var(--dur-fast) ease, opacity var(--dur-base) ease;
  /* 捻开：从中心收拢态旋出，中心向两端级联（--fd），spring 收尾 */
  animation: fanOpen var(--dur-slow) var(--ease-spring) backwards;
  animation-delay: var(--fd, 0s);
}
@keyframes fanOpen {
  from {
    transform: translate(0, 0.26rem) rotate(0deg) scale(0.55);
    opacity: 0;
  }
  55% {
    opacity: 1;
  }
}
/* 悬浮/按压：向上浮出拱面 + 金色辉光（径向近似为垂直上浮，浅弧下视觉等价） */
.fan-slot:hover,
.fan-slot:active {
  transform: translate(var(--tx), calc(var(--ty) - 0.05rem)) rotate(var(--tr, 0deg));
}
.fan-slot:hover :deep(.back),
.fan-slot:active :deep(.back) {
  filter: drop-shadow(0 0 10px rgba(212, 175, 55, 0.45));
}
.fan-slot :deep(.back) {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0.5rem;
  margin-left: -0.25rem;
  margin-top: -0.43rem;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
}
/* B1：被抽走的牌——向上拈出 + 微缩（从当前姿态淡出，像被手指捏走） */
.fan-slot.picked {
  pointer-events: none;
  animation: fanPick 0.4s var(--ease-out) forwards;
}
@keyframes fanPick {
  to {
    opacity: 0;
    transform: translate(var(--tx), calc(var(--ty) - 0.12rem)) rotate(var(--tr, 0deg)) scale(0.94);
  }
}

/* 已抽区：静态分行预示（行容量 5 均分居中），真身等克隆飞到才显（.incoming），落定 settle 微弹 */
.tray {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.05rem;
}
.tray-row {
  display: flex;
  justify-content: center;
  gap: 0.09rem;
  align-items: flex-end;
}
.tray-item {
  position: relative;
  width: 0.34rem;
}
.tray-item.incoming {
  opacity: 0;
}
/* B2：飞行落定的分量——与结果页 cardSettle 同语言 */
.tray-item.landed {
  animation: traySettle 0.3s var(--ease-spring);
}
@keyframes traySettle {
  from {
    transform: scale(1.08);
  }
}
/* 空槽：虚线位预示还差几张（与结果页虚线格同语言），聚拢时随让位淡出 */
.tray-slot-mark {
  width: 0.34rem;
  aspect-ratio: 7 / 12;
  border: 1px dashed var(--line);
  border-radius: 0.045rem;
  opacity: 0.55;
  transition: opacity var(--dur-base) ease;
}
.s-fan.gathering .tray-slot-mark {
  opacity: 0;
}
.tray-item :deep(.back) {
  width: 100%;
}
.tray-no {
  position: absolute;
  top: -0.02rem;
  left: -0.06rem;
  font-size: 0.1rem;
  font-style: normal;
  color: var(--gold-bright);
  background: rgba(13, 11, 20, 0.85);
  border-radius: 50%;
  width: 0.15rem;
  height: 0.15rem;
  line-height: 0.15rem;
  text-align: center;
  animation: popIn var(--dur-slow) var(--ease-spring) 0.2s backwards;
}
.tray-name {
  display: block;
  font-style: normal;
  text-align: center;
  color: var(--text-3);
  font-size: 0.08rem;
  margin-top: 0.02rem;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .deck.holding .deck-card {
    animation: none;
  }
  .center-pile,
  .phantom-card {
    animation: none !important;
  }
  .fan {
    animation: none;
  }
  .fan-slot.picked {
    animation: none;
    opacity: 0;
  }
  .tray-item.landed {
    animation: none;
  }
  .tray-no {
    animation: none;
  }
}
</style>
