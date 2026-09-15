<script setup lang="ts">
// S2-4/5 结果页（04 §3）：布阵展示 + 逐张翻牌 + 单牌段 + 关联位 + 综合结论四件套 + 免责 + 保存
// 快照纪律：解读在抽满时已组装（产文即快照），此处仅渲染；保存动作把它落入 historyStore
// 动效升级（08 §4.5/4.6）：入场"从一摞散落成阵"（接续 Draw 聚拢）→ 虚线格 → 翻牌 settle → 翻完天色微金
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cardMap, quotes, rituals, scenarioMap, spreadMap, subScenarioMap } from '@/data'
import { generateShareImage } from '@/engine/share'
import { useHistoryStore } from '@/stores/history'
import { useReadingStore } from '@/stores/reading'
import { useTaskStore } from '@/stores/task'
import { useSettingsStore } from '@/stores/settings'
import { useAiStore } from '@/stores/ai'
import { useToastStore } from '@/stores/toast'
import { aiReady, hostLabel } from '@/platform/aiStore'
import { describeAiError, enhance } from '@/engine/ai'
import { tap } from '@/platform/haptics'
import { playFlip, playReveal } from '@/platform/sound'
import { shareImage as shareImageOut } from '@/platform/share'
import { scheduleHindsight } from '@/platform/notify'
import CardBack from '@/components/CardBack.vue'
import CardFace from '@/components/CardFace.vue'
import { flyCard, reducedMotion } from '@/utils/flip'
import type { ReadingSnapshot } from '@/types'

const route = useRoute()
const router = useRouter()
const readingStore = useReadingStore()
const historyStore = useHistoryStore()
const taskStore = useTaskStore()
const toast = useToastStore()
const settingsStore = useSettingsStore()
const aiStore = useAiStore()

/* ---------- AI 深度解读（S5 / 11 §8.2）----------
   纪律：AI 永远排在静态解读之后；失败不写入快照，静态解读毫发无损（02 §5.5）。 */
const aiBusy = ref(false)
const aiError = ref('')
const aiConfirm = ref(false)
/** 取消用：自增 token，回来时对不上就丢弃结果（原生 HTTP 无法真正 abort） */
let aiToken = 0

const aiEnabled = computed(() => aiReady(aiStore.state))
const aiResult = computed(() => reading.value?.ai)

/** 错误文案 = 内容层文案 + 引擎带回的细节（如原始响应预览），不让人只能反复重试 */
function aiErrText(e: unknown): string {
  return describeAiError(e, rituals.ai.err)
}

async function generateAi(snap: ReadingSnapshot) {
  const my = ++aiToken
  aiBusy.value = true
  aiError.value = ''
  try {
    const res = await enhance(snap, aiStore.state)
    if (my !== aiToken) return // 已被取消
    historyStore.setAi(snap.id, res)
  } catch (e) {
    if (my !== aiToken) return
    aiError.value = aiErrText(e)
  } finally {
    if (my === aiToken) aiBusy.value = false
  }
}

function runAi() {
  const snap = reading.value
  if (!snap || isDraft.value || aiBusy.value) return
  // 未确认过知情 → 先弹窗（换服务商/baseUrl 后 confirmedAt 会被清空，11 §3.3）
  if (!aiStore.state.confirmedAt) {
    aiConfirm.value = true
    return
  }
  void generateAi(snap)
}

function confirmAi() {
  aiStore.state.confirmedAt = new Date().toISOString()
  aiConfirm.value = false
  const snap = reading.value
  if (snap) void generateAi(snap)
}

function cancelAi() {
  aiToken++
  aiBusy.value = false
}

/** 有 id 走历史快照；无 id 走进行中的占卜（尚未保存） */
const reading = computed<ReadingSnapshot | null>(() => {
  const id = route.params.id as string | undefined
  if (id) return historyStore.get(id) ?? null
  const r = readingStore
  if (r.question && r.spreadId && r.drawnCards && r.interpretation && r.deckSnapshot && r.cutIndex) {
    return {
      id: 'draft',
      createdAt: new Date().toISOString(),
      question: r.question,
      spreadId: r.spreadId,
      cards: r.drawnCards,
      deckSnapshot: r.deckSnapshot,
      cutIndex: r.cutIndex,
      interpretation: r.interpretation,
    }
  }
  return null
})

const spread = computed(() => (reading.value ? spreadMap.get(reading.value.spreadId) : undefined))

onMounted(() => {
  if (!reading.value) router.replace('/')
  else setTimeout(playScatter, 230) // 等路由进场转场收尾再散落
})

/* 散落入阵（08 §4.5 下半场）：中心一摞（stack-origin）逐张飞向格位，
   接续 Draw 页"聚拢"叙事；每格落定才亮真身 */
const scattering = ref(false)
let scatterTimers: ReturnType<typeof setTimeout>[] = []

async function playScatter() {
  if (reducedMotion()) return
  scattering.value = true
  await nextTick()
  const originBack = document.querySelector<HTMLElement>('.stack-origin .back')
  const slots = [...document.querySelectorAll<HTMLElement>('.slot')]
  if (!originBack || !slots.length) {
    scattering.value = false
    return
  }
  slots.forEach((slotEl, k) => {
    scatterTimers.push(
      setTimeout(async () => {
        const backEl = slotEl.querySelector('.back-face .back') as HTMLElement | null
        if (!backEl) return
        slotEl.classList.add('incoming') // 真身等克隆落定
        const sr = slotEl.getBoundingClientRect()
        const w = backEl.offsetWidth
        const h = backEl.offsetHeight
        const cross = slotEl.querySelector('.flip')?.classList.contains('cross')
        await flyCard(
          originBack,
          { left: sr.left + sr.width / 2 - w / 2, top: sr.top + sr.height / 2 - h / 2, width: w, height: h },
          { rotateTo: cross ? 90 : 0, duration: 560, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
        )
        slotEl.classList.remove('incoming')
        if (k === slots.length - 1) scattering.value = false
      }, k * 90),
    )
  })
}

onUnmounted(() => {
  document.body.classList.remove('sky-gold')
  scatterTimers.forEach(clearTimeout)
})

const isDraft = computed(() => !route.params.id)
const flipped = ref<number[]>([])
const saved = ref(false)

const allFlipped = computed(() =>
  !!reading.value && flipped.value.length === reading.value.cards.length,
)

const grid = computed(() => {
  const ps = spread.value?.positions ?? []
  const maxX = Math.max(...ps.map((p) => p.x))
  const maxY = Math.max(...ps.map((p) => p.y))
  return { cols: `repeat(${maxX + 1}, 1fr)`, rows: `repeat(${maxY + 1}, auto)` }
})

function cardAt(no: number) {
  const d = reading.value?.cards.find((c) => c.positionNo === no)
  return d ? cardMap.get(d.cardId) : undefined
}
function isFlipped(no: number) {
  return flipped.value.includes(no)
}
function flip(no: number) {
  if (!reading.value || isFlipped(no) || scattering.value) return
  flipped.value.push(no)
  void tap('medium') // 翻牌：中强度反馈（09 Q10）
  if (settingsStore.state.sound) playFlip()
}

/* 翻完全牌：布阵后撤让位文字，天色微金（08 §4.6 / §五） */
watch(allFlipped, (v) => {
  if (v) {
    document.body.classList.add('sky-gold')
    if (settingsStore.state.sound) playReveal() // 全翻开：氛围和声收束
    void tap('light') // 摊牌完成：一记轻反馈收尾（09 N6）
  }
})

const revealTip = computed(() => {
  if (allFlipped.value) return rituals.reveal.allDone
  if (flipped.value.length === 0) return rituals.reveal.ready
  return rituals.reveal.between.replace('{left}', String(reading.value!.cards.length - flipped.value.length))
})

const timeframeText = computed(() =>
  rituals.resultGuide.timeframe.replace('{timeframe}', `${reading.value?.question.timeframeMonths ?? 3}个月`),
)

/** 回显本次解读的背景（10 §6.4）：场景 · 子情境，让用户知道这份解读是针对什么写的 */
const backgroundText = computed(() => {
  const q = reading.value?.question
  if (!q?.scenarioId) return ''
  const sc = scenarioMap.get(q.scenarioId)
  if (!sc) return ''
  const sub = q.subScenarioId ? subScenarioMap.get(q.subScenarioId) : undefined
  return sub ? `解读背景：${sc.nameZh} · ${sub.nameZh}` : `解读背景：${sc.nameZh}`
})

function save() {
  if (!reading.value || !isDraft.value) return
  const snapshot: ReadingSnapshot = { ...reading.value, id: crypto.randomUUID() }
  historyStore.save(snapshot)
  if (spread.value?.cardCount === 3) taskStore.recordThreeCardReading()
  saved.value = true
  // 回顾提醒（03 §4.3 / 09 N4）：仅用户开启时排程，失败静默不影响保存
  if (settingsStore.state.hindsight && spread.value) {
    void scheduleHindsight(snapshot.id, spread.value.nameZh)
  }
  router.replace(`/result/${snapshot.id}`)
}

function finish() {
  readingStore.reset()
  router.push('/')
}

/* 分享图（S6/M3）：已保存的解读可生成；问题文本不上图（rituals.share.hint 承诺） */
const sharing = ref(false)
const shareImage = ref('')

async function makeShare() {
  if (!reading.value || !spread.value || sharing.value) return
  sharing.value = true
  try {
    const cards = reading.value.cards.map((d) => {
      const c = cardMap.get(d.cardId)!
      return { image: c.image, nameZh: c.nameZh, reversed: d.reversed, keywords: d.reversed ? c.keywords.rev : c.keywords.up }
    })
    const first = reading.value.cards[0]
    const quote = quotes[first.cardId]?.[first.reversed ? 'rev' : 'up'] ?? ''
    const url = `${location.href.split('#')[0]}#/result/${reading.value.id}`
    shareImage.value = await generateShareImage({ spreadName: spread.value.nameZh, cards, quote, url })
    toast.show(rituals.share.done, 3000)
  } catch {
    toast.show('分享图生成失败，请重试。')
  } finally {
    sharing.value = false
  }
}

/* 保存 / 分享：native 走系统分享面板（零权限），web 退化为下载（09 Q6） */
async function saveShare() {
  if (!shareImage.value) return
  const ok = await shareImageOut(shareImage.value, 'tarot-reading.png')
  if (!ok) toast.show('分享未拉起，可长按图片保存。')
}
</script>

<template>
  <div v-if="reading && spread" class="page result">
    <header class="head">
      <h1>{{ spread.nameZh }}</h1>
      <p class="q">「{{ reading.question.text }}」</p>
      <p v-if="backgroundText" class="bg">{{ backgroundText }}</p>
    </header>

    <!-- 布阵 -->
    <section
      class="board"
      :class="{ recede: allFlipped }"
      :style="{ gridTemplateColumns: grid.cols, gridTemplateRows: grid.rows }"
    >
      <!-- 散落入阵的飞行源：中心一摞（scattering 期间在场，08 §4.5） -->
      <div v-if="scattering" class="stack-origin"><CardBack /></div>
      <div
        v-for="p in spread.positions"
        :key="p.no"
        class="slot"
        :style="{ gridColumn: p.x + 1, gridRow: p.y + 1, '--no': p.no }"
        @click="flip(p.no)"
      >
        <div class="flip" :class="{ flipped: isFlipped(p.no), cross: p.rotate }">
          <div class="face back-face"><CardBack /></div>
          <div class="face front-face">
            <CardFace v-if="cardAt(p.no)" :card="cardAt(p.no)!" :reversed="reading.cards.find((c) => c.positionNo === p.no)!.reversed" />
          </div>
        </div>
        <span class="slot-no" :class="{ show: isFlipped(p.no) }">{{ p.no }}</span>
        <span class="slot-name" :class="{ show: isFlipped(p.no) }">{{ p.name }}</span>
      </div>
    </section>

    <p class="reveal-tip">{{ allFlipped ? '' : revealTip }}</p>

    <!-- 单牌段（翻开的逐张显示） -->
    <section v-for="pr in reading.interpretation.positions" :key="pr.positionNo" class="block" :class="{ hidden: !isFlipped(pr.positionNo) }">
      <div class="block-head">
        <span class="pos-name">{{ pr.positionName }}</span>
        <span class="card-name">{{ cardAt(pr.positionNo)?.nameZh }}</span>
        <span class="rev-mark" :class="{ rev: pr.reversed }">{{ pr.reversed ? '◆ 逆位' : '◇ 正位' }}</span>
      </div>
      <p class="block-text">{{ pr.text }}</p>
    </section>

    <template v-if="allFlipped">
      <!-- 关联位 -->
      <section v-if="reading.interpretation.links.length" class="block links a-fade-up">
        <h3>牌与牌之间</h3>
        <div v-for="(l, i) in reading.interpretation.links" :key="i" class="link-item">
          <span class="link-label">{{ l.label }}</span>
          <p class="block-text">{{ l.text }}</p>
        </div>
      </section>

      <!-- 综合结论 -->
      <section class="block summary a-fade-up" style="--d: 0.08s">
        <h3>{{ rituals.reveal.summaryLead }}</h3>
        <p class="block-text intro">{{ reading.interpretation.intro }}</p>
        <div class="sum-item">
          <span class="sum-tag">{{ reading.interpretation.summary.trendLabel }}</span>
          <p class="block-text">{{ reading.interpretation.summary.trendText }}</p>
        </div>
        <p class="block-text">{{ reading.interpretation.summary.majorText }}</p>
        <p class="block-text">{{ reading.interpretation.summary.elementText }}</p>
        <p class="block-text">{{ reading.interpretation.summary.actionLead }}</p>
        <ul class="actions">
          <li v-for="(a, i) in reading.interpretation.summary.actions" :key="i">{{ a }}</li>
        </ul>
        <p v-if="reading.interpretation.closing" class="closing">{{ reading.interpretation.closing }}</p>
      </section>

      <!-- AI 深度解读（S5 / 11 §8.2）：永远追加在静态解读之后，绝不覆盖它 -->
      <section class="block ai a-fade-up" style="--d: 0.12s">
        <h3>{{ rituals.ai.resultCta }}</h3>

        <template v-if="isDraft">
          <p class="ai-note">{{ rituals.ai.needSave }}</p>
        </template>

        <template v-else-if="!aiEnabled">
          <p class="ai-note">{{ rituals.ai.notConfigured }}</p>
          <router-link to="/settings" class="btn ghost">去设置</router-link>
        </template>

        <template v-else-if="aiBusy">
          <p class="ai-note">{{ rituals.ai.generating }}</p>
          <button type="button" class="btn ghost" @click="cancelAi">{{ rituals.ai.cancel }}</button>
        </template>

        <template v-else-if="aiResult">
          <p class="ai-badge">{{ rituals.ai.badge }} · {{ aiResult.model }}</p>
          <p v-if="aiResult.flagged?.length" class="ai-flag">
            {{ rituals.ai.flagWarn.replace('{n}', String(aiResult.flagged.length)) }}
          </p>
          <p class="block-text ai-text">{{ aiResult.text }}</p>
          <button type="button" class="btn ghost" @click="runAi">{{ rituals.ai.regenerate }}</button>
        </template>

        <template v-else>
          <p v-if="aiError" class="ai-err">{{ aiError }}</p>
          <button type="button" class="btn ghost" @click="runAi">{{ rituals.ai.generate }}</button>
          <p class="ai-note">{{ rituals.ai.sendNote }}</p>
        </template>
      </section>

      <!-- 如何理解 + 免责 -->
      <section class="block guide a-fade-up" style="--d: 0.16s">
        <h3>{{ rituals.resultGuide.title }}</h3>
        <p class="block-text">{{ timeframeText }}</p>
        <p class="block-text">{{ rituals.resultGuide.review }}</p>
        <p class="block-text">{{ rituals.resultGuide.mirror }}</p>
      </section>

      <footer class="disclaimer a-fade-up" style="--d: 0.22s">
        <p>本内容为传统文化体验与自我探索工具，仅供娱乐参考。</p>
        <p>重大决策请咨询专业人士。</p>
      </footer>

      <!-- 保存 / 完成 / 分享 -->
      <div v-if="isDraft" class="save-row a-fade-up" style="--d: 0.28s">
        <button type="button" class="btn ghost" @click="finish">不保存，结束</button>
        <button v-if="!saved" type="button" class="btn solid" @click="save">{{ rituals.save.ask }}</button>
      </div>
      <div v-else class="save-col a-fade-up" style="--d: 0.28s">
        <button type="button" class="btn solid" :disabled="sharing" @click="makeShare">
          {{ sharing ? '生成中……' : rituals.share.cta }}
        </button>
        <p class="share-hint">{{ rituals.share.hint }}</p>
        <button type="button" class="btn ghost" @click="finish">回首页</button>
      </div>
    </template>

    <!-- AI 知情确认（11 §3.3）：一次性；换服务商或地址后 confirmedAt 被清空，会重新确认 -->
    <div v-if="aiConfirm" class="mask" @click.self="aiConfirm = false">
      <div class="ai-confirm">
        <h3>{{ rituals.ai.confirmTitle }}</h3>
        <p class="block-text">{{ rituals.ai.confirmBody.replace('{host}', hostLabel(aiStore.state.baseUrl)) }}</p>
        <div class="share-btns">
          <button type="button" class="btn solid" @click="confirmAi">{{ rituals.ai.confirmOk }}</button>
          <button type="button" class="btn ghost" @click="aiConfirm = false">{{ rituals.ai.confirmCancel }}</button>
        </div>
      </div>
    </div>

    <!-- 分享图预览（长按保存 / 下载） -->
    <div v-if="shareImage" class="mask" @click.self="shareImage = ''">
      <div class="share-preview">
        <img :src="shareImage" alt="分享图" />
        <div class="share-btns">
          <button type="button" class="btn solid" @click="saveShare">保存 / 分享</button>
          <button type="button" class="btn ghost" @click="shareImage = ''">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result {
  padding-bottom: calc(0.3rem + var(--safe-bottom));
}
.head {
  text-align: center;
  padding-top: calc(0.06rem + var(--safe-top));
}
h1 {
  font-size: 0.18rem;
}
.q {
  color: var(--text-3);
  font-size: 0.11rem;
  margin-top: 0.04rem;
}
.bg {
  color: var(--gold-dim);
  font-size: 0.1rem;
  margin-top: 0.05rem;
}

/* 布阵（08 §4.6）：虚线格常驻未翻位（暗示"阵"的结构），翻开后退场；
   入场由"散落入阵"飞行承担（替代原 fadeUp），reduced-motion/兜底时直接在位 */
.board {
  display: grid;
  gap: 0.07rem;
  margin: 0.14rem 0.1rem;
  transition: transform var(--dur-slow) var(--ease-out);
}
.board.recede {
  transform: scale(0.98); /* 摊牌完成：整体后撤，把焦点让给文字 */
}
/* 散落飞行源：屏幕中心的一摞（fixed，只作克隆参照） */
.stack-origin {
  position: fixed;
  left: 50%;
  top: 50%;
  width: 0.5rem;
  transform: translate(-50%, -50%);
  z-index: 15;
  pointer-events: none;
}
.slot {
  position: relative;
  cursor: pointer;
  perspective: 700px;
}
.slot::before {
  content: '';
  position: absolute;
  inset: -3%;
  border: 1px dashed var(--line);
  border-radius: 10px;
  pointer-events: none;
  transition: opacity var(--dur-base) ease;
}
.slot:has(.flip.flipped)::before {
  opacity: 0;
}
.slot.incoming .flip {
  opacity: 0; /* 真身等克隆落定 */
}
/* 翻开瞬间 settle：容器微放大后落稳（叠加在 flip 外层，不占 rotateY 的 transform） */
.slot:has(.flip.flipped) {
  animation: cardSettle var(--dur-base) var(--ease-out) 300ms both;
}
@keyframes cardSettle {
  from {
    transform: scale(1.05);
  }
  to {
    transform: scale(1);
  }
}
.flip {
  position: relative;
  width: 100%;
  aspect-ratio: 7 / 12;
  transform-style: preserve-3d;
  transition: transform 0.65s var(--ease-flip); /* 起手缓-中段快-收尾稳（禁过冲，防闪背面） */
}
.flip.flipped {
  transform: rotateY(180deg);
}
.flip.cross {
  transform: rotate(90deg);
}
/* 翻牌瞬间的金光一闪：预置阴影，只动 opacity */
.front-face {
  position: relative;
}
.front-face::after {
  content: '';
  position: absolute;
  inset: -4%;
  border-radius: 10px;
  box-shadow: 0 0 26px 6px rgba(212, 175, 55, 0.5);
  opacity: 0;
  pointer-events: none;
}
.flip.flipped .front-face::after {
  animation: flashIn 0.8s ease;
}
.flip.cross.flipped {
  transform: rotate(90deg) rotateY(180deg);
}
.face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
}
.front-face {
  transform: rotateY(180deg);
}
.slot-no {
  position: absolute;
  top: -0.03rem;
  left: -0.03rem;
  width: 0.16rem;
  height: 0.16rem;
  line-height: 0.16rem;
  text-align: center;
  font-size: 0.09rem;
  color: var(--text-3);
  border: 1px solid var(--line);
  border-radius: 50%;
  background: rgba(13, 11, 20, 0.85);
  opacity: 0.65;
}
.slot-no.show {
  color: var(--gold-bright);
  border-color: var(--gold-dim);
  opacity: 1;
}
/* 丁：牌底"入夜"渐暗带——牌背暗金纹样与位名色相/亮度双近，字会糊进纹样里（真机反馈）；
   渐变叠层盖在牌底（不动 CardBack 组件），未翻淡字/已翻金字同坐稳定暗底，与星空氛围同语言 */
.slot::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 0.24rem;
  background: linear-gradient(180deg, transparent, rgba(10, 8, 16, 0.88) 30%);
  border-radius: 0 0 10px 10px;
  pointer-events: none;
  z-index: 1; /* 压过 .flip；位名再压过它 */
}
/* 位名常驻（未翻淡色指路，翻开后金色上浮，08 §4.6）；
   甲：收进牌底内侧——密阵（马蹄/凯尔特）行距 7px 装不下外伸字，会被下一行同列的牌盖住；
   未翻色 text-2 → text 提亮一档（暗带已稳定，真机 390 视口淡紫灰仍偏弱）；
   left/right 全宽居中让 transform 专属动画（原 translate(-50%) 布局被 fadeUp 终态 none 覆盖，翻开后位名会右偏半个字宽） */
.slot-name {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0.02rem;
  text-align: center;
  font-size: 0.09rem;
  color: var(--text);
  white-space: nowrap;
  opacity: 0.8;
  text-shadow: 0 0 4px rgba(10, 8, 16, 0.9), 0 1px 3px rgba(0, 0, 0, 0.85); /* 软晕兜底细笔画字顶（四字位名最密处） */
  z-index: 2;
}
.slot-name.show {
  color: var(--gold-bright);
  opacity: 1;
  animation: fadeUp var(--dur-base) var(--ease-out) 340ms both;
}
.reveal-tip {
  text-align: center;
  color: var(--text-2);
  font-size: 0.11rem;
  min-height: 0.16rem;
  margin-bottom: 0.1rem;
}

/* 文字段 */
.block {
  background: var(--panel);
  border: 1px solid rgba(212, 175, 55, 0.12);
  border-radius: var(--radius-s);
  padding: 0.12rem 0.14rem;
  margin: 0 0 0.1rem;
  animation: fadeUp 0.35s ease both; /* display:none→block 时重放：翻牌逐段揭示 */
}
.block.hidden {
  display: none;
}
.block h3 {
  font-size: 0.13rem;
  color: var(--gold);
  margin-bottom: 0.06rem;
}
.block-head {
  display: flex;
  align-items: baseline;
  gap: 0.08rem;
  margin-bottom: 0.06rem;
}
.pos-name {
  font-size: 0.12rem;
  color: var(--gold);
}
.card-name {
  font-family: var(--font-serif);
  font-size: 0.14rem;
  color: var(--text);
}
.rev-mark {
  font-size: 0.1rem;
  color: var(--accent-up);
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 0 0.07rem;
}
.rev-mark.rev {
  color: var(--accent-rev);
}
.block-text {
  color: var(--text);
  font-size: 0.13rem;
  line-height: 1.75;
}
.block-text.intro {
  color: var(--text-2);
  border-left: 2px solid var(--gold-dim);
  padding-left: 0.1rem;
}
.link-item {
  margin-bottom: 0.1rem;
}
.link-item:last-child {
  margin-bottom: 0;
}
.link-label {
  display: inline-block;
  font-size: 0.1rem;
  color: var(--gold-bright);
  background: rgba(212, 175, 55, 0.1);
  border-radius: 999px;
  padding: 0.01rem 0.1rem;
  margin-bottom: 0.04rem;
}
.sum-item {
  margin: 0.08rem 0;
}
.sum-tag {
  display: inline-block;
  font-size: 0.11rem;
  color: #14101f;
  background: linear-gradient(160deg, var(--gold-bright), var(--gold));
  border-radius: 999px;
  padding: 0.01rem 0.12rem;
  margin-bottom: 0.04rem;
}
.actions {
  margin: 0.06rem 0 0;
  padding-left: 0.2rem;
}
.actions li {
  color: var(--text);
  font-size: 0.13rem;
  line-height: 1.75;
}
.closing {
  margin-top: 0.1rem;
  padding-top: 0.1rem;
  border-top: 1px dashed var(--gold-dim);
  color: var(--gold-bright);
  font-size: 0.12rem;
  line-height: 1.8;
}
.guide h3 {
  color: var(--text-2);
}
.disclaimer {
  text-align: center;
  color: var(--text-3);
  font-size: 0.09rem;
  line-height: 1.7;
  margin: 0.08rem 0 0.14rem;
}
.save-row {
  display: flex;
  gap: 0.1rem;
}
.save-col {
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
}
.share-hint {
  font-size: 0.09rem;
  color: var(--text-3);
  text-align: center;
}
.share-preview {
  width: min(84%, 3.4rem);
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}
.share-preview img {
  width: 100%;
  border-radius: 10px;
  border: 1px solid var(--gold-dim);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}
.share-btns {
  display: flex;
  gap: 0.1rem;
}
.share-btns .btn {
  flex: 1;
  text-align: center;
  font-size: 0.13rem;
  border-radius: 999px;
  padding: 0.1rem 0;
  text-decoration: none;
}
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}
.btn {
  flex: 1;
  font-size: 0.13rem;
  border-radius: 999px;
  padding: 0.1rem 0;
}
.btn.ghost {
  color: var(--text-2);
  border: 1px solid var(--line);
  background: none;
}
.btn.solid {
  color: #14101f;
  background: linear-gradient(160deg, var(--gold-bright), var(--gold));
  border: none;
}

/* AI 深度解读（11 §8.2 / §3.1：AI 生成必须显著标识） */
.ai-badge {
  font-size: 0.1rem;
  color: var(--gold-bright);
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 999px;
  padding: 0.04rem 0.1rem;
  display: inline-block;
  margin-bottom: 0.08rem;
}
.ai-flag {
  font-size: 0.1rem;
  color: #e0b060;
  background: rgba(224, 176, 96, 0.1);
  border-radius: 8px;
  padding: 0.06rem 0.08rem;
  margin-bottom: 0.08rem;
  line-height: 1.6;
}
.ai-err {
  font-size: 0.11rem;
  color: #e0a0a0;
  line-height: 1.7;
  margin-bottom: 0.08rem;
}
.ai-note {
  font-size: 0.1rem;
  color: var(--text-3);
  line-height: 1.7;
  margin: 0.06rem 0 0.08rem;
}
.ai-text {
  white-space: pre-wrap;
}
.ai .btn.ghost {
  width: 100%;
}
.ai-confirm {
  width: 82%;
  max-width: 3.2rem;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 0.18rem 0.16rem;
}
.ai-confirm h3 {
  font-size: 0.14rem;
  margin-bottom: 0.08rem;
}
.ai-confirm .share-btns {
  margin-top: 0.14rem;
}

@media (prefers-reduced-motion: reduce) {
  .flip { transition: none; }
}
</style>
