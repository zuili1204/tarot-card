<script setup lang="ts">
// 首页（M3 版，04 §3 + 07 §1.2）：每日一抽闭环（双向出口）+ 深度占卜/词典入口 + 新手任务条 + 最近 3 条
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { cardMap, cards, quotes, rituals } from '@/data'
import { createDraw, shuffleDeck } from '@/engine/shuffle'
import { useDailyStore } from '@/stores/daily'
import { useHistoryStore } from '@/stores/history'
import { useSettingsStore } from '@/stores/settings'
import { useTaskStore } from '@/stores/task'
import { useToastStore } from '@/stores/toast'
import CardBack from '@/components/CardBack.vue'
import CardFace from '@/components/CardFace.vue'
import TaskProgress from '@/components/TaskProgress.vue'
import { tap } from '@/platform/haptics'
import { playFlip } from '@/platform/sound'
import type { Card } from '@/types'

const router = useRouter()
const dailyStore = useDailyStore()
const taskStore = useTaskStore()
const settingsStore = useSettingsStore()
const historyStore = useHistoryStore()
const toast = useToastStore()

const CARD_IDS = cards.map((c) => c.id)

/* ---------- 每日一抽（07 §1.2） ---------- */
const today = computed(() => dailyStore.today())
const drawing = ref(false) // 翻牌动画播放中
const settled = ref(false) // 出口 A「今天就这样」的收起（会话内状态，明日重置）
const morningGreet = computed(() => (new Date().getHours() < 18 ? rituals.daily.morning : rituals.daily.evening))

const dailyCard = computed(() => (today.value ? cardMap.get(today.value.cardId) : undefined))
/* 先抽结果后翻牌（08 §4.7）：翻牌前结果已定，动画只是揭示，不参与随机 */
const pendingCard = ref<Card | undefined>()
const pendingReversed = ref(false)
const dailyKeywords = computed(() => {
  if (!today.value || !dailyCard.value) return ''
  return (today.value.reversed ? dailyCard.value.keywords.rev : dailyCard.value.keywords.up).join(' · ')
})
const dailyCore = computed(() => {
  if (!today.value || !dailyCard.value) return ''
  return today.value.reversed ? dailyCard.value.core.rev : dailyCard.value.core.up
})
const dailyQuote = computed(() => {
  if (!today.value) return ''
  return quotes[today.value.cardId]?.[today.value.reversed ? 'rev' : 'up'] ?? ''
})

function drawDaily() {
  if (today.value || drawing.value) return
  const { deckSnapshot, orientation } = shuffleDeck(CARD_IDS)
  const one = createDraw(deckSnapshot, orientation, 1).draw(1, settingsStore.state.reversed)[0]
  // 先得结果再翻牌：双面 3D 翻转揭示牌面，翻完停留一拍再落库（视觉与状态同刻）
  pendingCard.value = cardMap.get(one.cardId)
  pendingReversed.value = one.reversed
  drawing.value = true
  void tap('medium') // 每日一抽翻牌反馈
  if (settingsStore.state.sound) playFlip()
  setTimeout(() => {
    dailyStore.saveToday({ cardId: one.cardId, reversed: one.reversed })
    taskStore.recordDailyDraw()
    drawing.value = false
  }, 850)
}

function settle() {
  settled.value = true
  toast.show(rituals.dailyExit.settleToast)
}

/* ---------- 新手任务（07 §2） ---------- */
// 三步全齐瞬间的一次性 toast（组件随后被 v-if 收起）
watch(
  () => taskStore.unlockedAdvanced,
  (v, old) => {
    if (v && !old) toast.show(rituals.tasks.unlockedToast, 3000)
  },
)

/* ---------- 最近记录 ---------- */
const recent = computed(() => historyStore.readings.slice(0, 3))
function fmtDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}
</script>

<template>
  <div class="page home">
    <div class="brand a-fade-up">
      <div class="brand-mark">
        <svg viewBox="0 0 24 24" class="star">
          <path d="M12 3 L14.1 9.9 L21 12 L14.1 14.1 L12 21 L9.9 14.1 L3 12 L9.9 9.9 Z" fill="var(--gold)" />
        </svg>
      </div>
      <h1 class="brand-name a-shimmer-text">Tarot Card</h1>
      <p class="brand-slogan">七十八张牌，一副随身的镜子。</p>
      <nav class="mini-nav">
        <router-link to="/history">历史</router-link>
        <span class="sep">·</span>
        <router-link to="/settings">设置</router-link>
        <span class="sep">·</span>
        <router-link to="/stats">统计</router-link>
      </nav>
    </div>

    <!-- 每日一抽 -->
    <section class="daily a-fade-up" :class="{ done: !!today }" style="--d: 0.07s">
      <template v-if="!today">
        <p class="daily-greet">{{ morningGreet }}</p>
        <button type="button" class="daily-card-btn" :class="{ drawing }" :disabled="drawing" @click="drawDaily">
          <div class="daily-flip" :class="{ flipped: drawing }">
            <div class="daily-inner">
              <div class="dface dback"><CardBack size="sm" /></div>
              <div class="dface dfront">
                <CardFace v-if="pendingCard" :card="pendingCard" :reversed="pendingReversed" size="sm" />
              </div>
            </div>
          </div>
          <span class="daily-hint">{{ drawing ? '……' : '轻触牌背，抽今日一张' }}</span>
        </button>
      </template>
      <template v-else-if="!settled">
        <div class="daily-head a-fade-up">
          <span class="daily-tag">今日指引</span>
          <span class="daily-rev" :class="{ rev: today.reversed }">{{ today.reversed ? '◆ 逆位' : '◇ 正位' }}</span>
        </div>
        <div class="daily-body a-fade-up" style="--d: 0.06s">
          <div class="daily-face">
            <CardFace :card="dailyCard!" size="sm" />
          </div>
          <div class="daily-info">
            <h2 class="daily-name">{{ dailyCard!.nameZh }}</h2>
            <p class="daily-keywords">{{ dailyKeywords }}</p>
            <p class="daily-core">{{ dailyCore }}</p>
          </div>
        </div>
        <p class="daily-advice a-fade-up" style="--d: 0.13s"><span class="lead">今日功课</span>{{ dailyCard!.advice }}</p>
        <p v-if="dailyQuote" class="daily-quote a-fade-up" style="--d: 0.19s">「{{ dailyQuote }}」</p>
        <div class="exit-bar a-fade-up" style="--d: 0.25s">
          <button type="button" class="btn ghost" @click="settle">{{ rituals.dailyExit.settle }}</button>
          <button type="button" class="btn solid" @click="router.push('/ask')">{{ rituals.dailyExit.goDeep }}</button>
        </div>
        <router-link :to="`/card/${today.cardId}`" class="what-card a-fade-up" style="--d: 0.31s">{{ rituals.dailyExit.whatCard }} →</router-link>
      </template>
      <template v-else>
        <p class="daily-settled">{{ rituals.daily.done }}</p>
      </template>
    </section>

    <nav class="entries">
      <router-link to="/ask" class="entry open a-fade-up" style="--d: 0.14s">
        <span class="entry-name">深度占卜</span>
        <span class="entry-sub">心里有事，花三分钟问一次牌</span>
        <span class="entry-tag">可用</span>
      </router-link>
      <router-link to="/yesno" class="entry open a-fade-up" style="--d: 0.17s">
        <span class="entry-name">是 / 否单抽</span>
        <span class="entry-sub">一个小问题，抽一张看倾向</span>
        <span class="entry-tag">可用</span>
      </router-link>
      <router-link to="/learn" class="entry open a-fade-up" style="--d: 0.2s">
        <span class="entry-name">入门三课</span>
        <span class="entry-sub">十分钟读懂牌，从这三篇开始</span>
        <span class="entry-tag">可用</span>
      </router-link>
      <router-link to="/library" class="entry open a-fade-up" style="--d: 0.23s">
        <span class="entry-name">牌义词典</span>
        <span class="entry-sub">七十八张牌，正逆位与三域牌义</span>
        <span class="entry-tag">可用</span>
      </router-link>
    </nav>

    <div v-if="!taskStore.unlockedAdvanced" class="a-fade-up" style="--d: 0.26s">
      <TaskProgress />
    </div>

    <section v-if="recent.length" class="recent a-fade-up" style="--d: 0.32s">
      <div class="recent-head">
        <h3>最近记录</h3>
        <router-link to="/history" class="recent-all">全部 →</router-link>
      </div>
      <router-link v-for="r in recent" :key="r.id" :to="`/result/${r.id}`" class="recent-item">
        <span class="recent-q">「{{ r.question.text }}」</span>
        <span class="recent-meta">{{ fmtDate(r.createdAt) }}</span>
      </router-link>
    </section>

    <footer class="foot">
      <p>本内容为传统文化体验与自我探索工具，仅供娱乐参考。</p>
      <p>重大决策请咨询专业人士。</p>
    </footer>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding-top: calc(0.5rem + var(--safe-top));
  padding-bottom: calc(0.24rem + var(--safe-bottom));
}
.brand {
  text-align: center;
  margin-bottom: 0.32rem;
  position: relative;
}
.star {
  width: 0.3rem;
  filter: drop-shadow(0 0 12px rgba(212, 175, 55, 0.45));
}
.brand-name {
  font-size: 0.26rem;
  letter-spacing: 0.06em;
  margin-top: 0.08rem;
}
.brand-slogan {
  color: var(--text-2);
  font-size: 0.12rem;
  margin-top: 0.05rem;
}
.mini-nav {
  position: absolute;
  right: 0;
  top: 0.02rem;
  font-size: 0.11rem;
  color: var(--text-3);
  display: flex;
  gap: 0.06rem;
  align-items: center;
}
.mini-nav a {
  color: var(--text-3);
}
.sep {
  color: var(--line);
}

/* 每日一抽 */
.daily {
  background: linear-gradient(165deg, rgba(212, 175, 55, 0.07), var(--panel) 55%);
  border: 1px solid var(--gold-dim);
  border-radius: var(--radius);
  padding: 0.2rem 0.18rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 0.14rem;
}
.daily-greet {
  color: var(--text-2);
  font-size: 0.13rem;
  margin-bottom: 0.16rem;
}
.daily-card-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.14rem;
}
/* 每日一抽（08 §4.7）：真双面 3D 翻牌（perspective + preserve-3d），替换单面 540° 平转 */
.daily-flip {
  position: relative;
  width: 46%;
  aspect-ratio: 7 / 12;
  perspective: 700px;
  /* 停—浮—停：8s 周期前 35% 静止、中段缓缓起伏一次（神秘感 = 有大段安静，勿用永动 floatBob） */
  animation: dailyBob 8s ease-in-out infinite;
}
@keyframes dailyBob {
  0%,
  35%,
  100% {
    transform: translateY(0);
  }
  55% {
    transform: translateY(-0.02rem);
  }
  75% {
    transform: translateY(0);
  }
}
/* 牌后暖金柔晕：从牌背透出（z 序在 3D 牌层之下），与浮动错相呼吸——只动 opacity */
.daily-flip::before {
  content: '';
  position: absolute;
  inset: -15%;
  z-index: -1;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(212, 175, 55, 0.25), rgba(212, 175, 55, 0.08) 55%, transparent 72%);
  animation: haloBreath 7s ease-in-out infinite;
}
@keyframes haloBreath {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}
.daily-card-btn.drawing .daily-flip {
  animation: none;
}
/* 翻牌时晕光淡出定格：高光时刻让给牌面 flashIn，两光不打架 */
.daily-card-btn.drawing .daily-flip::before {
  animation: none;
  opacity: 0.25;
}
.daily-inner {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 0.65s var(--ease-flip);
}
.daily-flip.flipped .daily-inner {
  transform: rotateY(180deg);
}
.dface {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
}
.dface :deep(.back),
.dface :deep(.face) {
  width: 100%;
}
.dfront {
  transform: rotateY(180deg);
}
/* 翻过中轴金光一闪（预置阴影只动 opacity） */
.dfront::after {
  content: '';
  position: absolute;
  inset: -4%;
  border-radius: 10px;
  box-shadow: 0 0 26px 6px rgba(212, 175, 55, 0.5);
  opacity: 0;
  pointer-events: none;
}
.daily-flip.flipped .dfront::after {
  animation: flashIn 0.8s ease 0.3s both;
}
.daily-hint {
  font-size: 0.11rem;
  color: var(--text-3);
}
.daily-head {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.12rem;
}
.daily-tag {
  font-family: var(--font-serif);
  color: var(--gold-bright);
  font-size: 0.13rem;
}
.daily-rev {
  font-size: 0.1rem;
  color: var(--text-2);
}
.daily-rev.rev {
  color: var(--text);
}
.daily-body {
  width: 100%;
  display: flex;
  gap: 0.16rem;
  align-items: stretch;
}
.daily-face {
  width: 34%;
  flex-shrink: 0;
  align-self: center;
}
.daily-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.daily-name {
  font-size: 0.17rem;
}
.daily-keywords {
  color: var(--gold);
  font-size: 0.1rem;
  margin-top: 0.04rem;
}
.daily-core {
  color: var(--text-2);
  font-size: 0.115rem;
  line-height: 1.8;
  margin-top: 0.08rem;
}
.daily-advice {
  width: 100%;
  margin-top: 0.14rem;
  font-size: 0.11rem;
  color: var(--text);
  background: rgba(212, 175, 55, 0.06);
  border: 1px dashed var(--gold-dim);
  border-radius: 8px;
  padding: 0.1rem 0.12rem;
  line-height: 1.8;
}
.daily-advice .lead {
  color: var(--gold-bright);
  margin-right: 0.08rem;
}
.daily-quote {
  margin-top: 0.12rem;
  font-family: var(--font-serif);
  color: var(--text-3);
  font-size: 0.11rem;
  text-align: center;
}
.exit-bar {
  width: 100%;
  display: flex;
  gap: 0.1rem;
  margin-top: 0.16rem;
}
.what-card {
  margin-top: 0.12rem;
  font-size: 0.11rem;
  color: var(--gold);
}
.daily-settled {
  color: var(--text-3);
  font-size: 0.12rem;
  padding: 0.08rem 0;
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
}
.btn.solid {
  color: #14101f;
  background: linear-gradient(160deg, var(--gold-bright), var(--gold));
}

.entries {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  margin-bottom: 0.14rem;
}
.entry {
  display: flex;
  flex-direction: column;
  gap: 0.02rem;
  background: var(--panel);
  border: 1px solid var(--gold-dim);
  border-radius: var(--radius);
  padding: 0.16rem 0.18rem;
  position: relative;
  background: linear-gradient(160deg, rgba(212, 175, 55, 0.09), var(--panel) 60%);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}
.entry:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(212, 175, 55, 0.25);
}
.entry-name {
  font-family: var(--font-serif);
  font-size: 0.16rem;
  color: var(--gold-bright);
}
.entry-sub {
  font-size: 0.11rem;
  color: var(--text-2);
}
.entry-tag {
  position: absolute;
  right: 0.14rem;
  top: 0.14rem;
  font-size: 0.09rem;
  color: var(--gold-bright);
  border: 1px solid var(--gold-dim);
  border-radius: 999px;
  padding: 0 0.08rem;
}

.recent {
  margin-bottom: 0.14rem;
}
.recent-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.06rem;
}
.recent-head h3 {
  font-size: 0.13rem;
}
.recent-all {
  font-size: 0.1rem;
  color: var(--text-3);
}
.recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.1rem;
  padding: 0.1rem 0.12rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  margin-bottom: 0.06rem;
  background: var(--panel);
}
.recent-q {
  flex: 1;
  min-width: 0;
  font-size: 0.11rem;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recent-meta {
  font-size: 0.09rem;
  color: var(--text-3);
  flex-shrink: 0;
}

.foot {
  margin-top: auto;
  text-align: center;
  color: var(--text-3);
  font-size: 0.09rem;
  line-height: 1.7;
}

@media (prefers-reduced-motion: reduce) {
  .daily-flip,
  .daily-flip::before {
    animation: none;
  }
  .daily-flip::before {
    opacity: 0.7; /* 光晕静态常驻 */
  }
}
</style>
