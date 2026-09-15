<script setup lang="ts">
// 是/否单抽（01 §3.5，09 N1）：轻量入口——抽 1 张，看三档倾向，并把用户引向开放式提问。
// 随机性纪律与 S2 一致：洗牌固化全排列 + 切牌偏移 + deckSnapshot 落库可回验（07 §3）。
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { cardMap, cards, rituals, spreadMap } from '@/data'
import { createDraw, shuffleDeck } from '@/engine/shuffle'
import { composeReading } from '@/engine/interpreter'
import { composeYesNo } from '@/engine/yesno'
import { useHistoryStore } from '@/stores/history'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'
import CardBack from '@/components/CardBack.vue'
import CardFace from '@/components/CardFace.vue'
import { tap } from '@/platform/haptics'
import { playFlip } from '@/platform/sound'
import { flushStorage } from '@/platform/storage'
import type { Card, ReadingSnapshot } from '@/types'

const router = useRouter()
const historyStore = useHistoryStore()
const settingsStore = useSettingsStore()
const toast = useToastStore()

const CARD_IDS = cards.map((c) => c.id)
const SPREAD_ID = 'yesno-single'

const text = ref('')
const drawing = ref(false)
const savedId = ref('')
const result = ref<{ card: Card; reversed: boolean; deckSnapshot: string[]; cutIndex: 1 | 2 | 3 } | null>(null)

const verdict = computed(() =>
  result.value ? composeYesNo(result.value.card.id, result.value.reversed) : null,
)

/** 切牌：拒绝采样取 1-3，随机源与洗牌同族（crypto），保持"可验证的诚实随机"（07 §3） */
function pickCut(): 1 | 2 | 3 {
  const buf = new Uint8Array(1)
  let v: number
  do {
    crypto.getRandomValues(buf)
    v = buf[0] % 4
  } while (v === 3)
  return (v + 1) as 1 | 2 | 3
}

function draw() {
  if (drawing.value) return
  savedId.value = ''
  result.value = null
  drawing.value = true
  const { deckSnapshot, orientation } = shuffleDeck(CARD_IDS)
  const cutIndex = pickCut()
  const one = createDraw(deckSnapshot, orientation, cutIndex).draw(1, settingsStore.state.reversed)[0]
  const card = cardMap.get(one.cardId)
  void tap('medium')
  if (settingsStore.state.sound) playFlip()
  // 先得结果再翻牌：视觉与状态同刻（与每日一抽同构，07 §1.2）
  setTimeout(() => {
    drawing.value = false
    if (card) result.value = { card, reversed: one.reversed, deckSnapshot, cutIndex }
  }, 650)
}

function save() {
  if (!result.value || savedId.value) return
  const r = result.value
  const question = {
    text: text.value.trim() || rituals.yesNo.placeholder.replace('例如：', '').replace('……', ''),
    domain: 'general' as const,
    timeframeMonths: 1 as const,
  }
  const drawnCards = [{ cardId: r.card.id, reversed: r.reversed, positionNo: 1 }]
  const spread = spreadMap.get(SPREAD_ID)!
  const snapshot: ReadingSnapshot = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    question,
    spreadId: SPREAD_ID,
    cards: drawnCards,
    deckSnapshot: r.deckSnapshot,
    cutIndex: r.cutIndex,
    // 走同一套组装引擎：历史回看与分享图可完全复用（产文即快照）
    interpretation: composeReading({ question, spread, cards: drawnCards }),
  }
  savedId.value = historyStore.save(snapshot)
  void flushStorage()
  toast.show(rituals.yesNo.saved)
}
</script>

<template>
  <div class="page yesno">
    <header class="head">
      <router-link to="/" class="back">← 首页</router-link>
      <h1>是 / 否单抽</h1>
      <p class="lead">{{ rituals.yesNo.enter }}</p>
    </header>

    <input
      v-model="text"
      class="q-input"
      type="text"
      :placeholder="rituals.yesNo.placeholder"
      maxlength="40"
    />

    <section class="stage">
      <button type="button" class="card-btn" :class="{ drawing }" :disabled="drawing" @click="draw">
        <div class="flip" :class="{ flipped: !!result }">
          <div class="inner">
            <div class="face fback"><CardBack size="sm" /></div>
            <div class="face ffront">
              <CardFace v-if="result" :card="result.card" :reversed="result.reversed" size="sm" />
            </div>
          </div>
        </div>
        <span class="hint">
          {{ drawing ? rituals.yesNo.drawing : result ? rituals.yesNo.again : rituals.yesNo.draw }}
        </span>
      </button>
    </section>

    <section v-if="result && verdict" class="answer a-fade-up">
      <p class="verdict" :class="verdict.verdict">{{ verdict.label }}</p>
      <p class="note">{{ verdict.note }}</p>
      <p v-if="verdict.reversedNote" class="rev-note">{{ verdict.reversedNote }}</p>

      <div class="detail">
        <p class="detail-lead">{{ rituals.yesNo.detailLead }}</p>
        <p class="card-name">
          {{ result.card.nameZh }}
          <span class="rev">{{ result.reversed ? '◆ 逆位' : '◇ 正位' }}</span>
        </p>
        <p class="keywords">{{ verdict.keywords.join(' · ') }}</p>
        <p class="core">{{ verdict.detail }}</p>
        <p class="advice"><span class="mini">功课</span>{{ verdict.advice }}</p>
      </div>

      <p class="guide">{{ verdict.guide }}</p>

      <div class="acts">
        <button type="button" class="btn ghost" @click="draw">再抽一次</button>
        <button type="button" class="btn solid" @click="router.push('/ask')">{{ rituals.yesNo.toDeep }}</button>
      </div>
      <button v-if="!savedId" type="button" class="btn save" @click="save">{{ rituals.save.ask }}</button>
      <p v-else class="saved">已收进历史，可在「历史」里回看。</p>
    </section>

    <footer class="disclaimer">
      <p>本内容为传统文化体验与自我探索工具，仅供娱乐参考。</p>
      <p>重大决策请咨询专业人士。</p>
    </footer>
  </div>
</template>

<style scoped>
.yesno {
  padding-bottom: calc(0.3rem + var(--safe-bottom));
}
.head {
  text-align: center;
  padding-top: calc(0.06rem + var(--safe-top));
}
.back {
  display: inline-block;
  font-size: 0.12rem;
  color: var(--text-3);
  margin-bottom: 0.1rem;
}
h1 {
  font-size: 0.2rem;
}
.lead {
  font-size: 0.12rem;
  color: var(--text-2);
  margin-top: 0.06rem;
}

.q-input {
  display: block;
  width: 100%;
  margin-top: 0.16rem;
  padding: 0.12rem 0.14rem;
  font-size: 0.13rem;
  color: var(--text);
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius-s);
}
.q-input::placeholder {
  color: var(--text-3);
}

.stage {
  display: flex;
  justify-content: center;
  margin: 0.2rem 0 0.04rem;
}
.card-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}
.flip {
  width: 0.98rem;
  perspective: 700px;
}
.inner {
  position: relative;
  width: 100%;
  transform-style: preserve-3d;
  transition: transform 650ms var(--ease-flip);
}
.flipped .inner {
  transform: rotateY(180deg);
}
.face {
  backface-visibility: hidden;
}
.ffront {
  position: absolute;
  inset: 0;
  transform: rotateY(180deg);
}
.hint {
  font-size: 0.11rem;
  color: var(--text-3);
}

.answer {
  margin-top: 0.1rem;
  text-align: center;
}
.verdict {
  font-family: var(--font-serif);
  font-size: 0.26rem;
  color: var(--gold-bright);
  letter-spacing: 0.02rem;
}
.verdict.yes {
  color: #d8b45a;
}
.verdict.no {
  color: #9b93a8;
}
.verdict.vague {
  color: #b9a64c;
}
.note {
  font-size: 0.12rem;
  color: var(--text-2);
  margin-top: 0.06rem;
}
.rev-note {
  font-size: 0.11rem;
  color: var(--accent-rev);
  margin-top: 0.06rem;
}

.detail {
  margin-top: 0.18rem;
  padding: 0.14rem 0.16rem;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  text-align: left;
}
.detail-lead {
  font-size: 0.1rem;
  color: var(--text-3);
  margin-bottom: 0.06rem;
}
.card-name {
  font-family: var(--font-serif);
  font-size: 0.15rem;
  color: var(--gold-bright);
}
.rev {
  font-size: 0.1rem;
  color: var(--text-3);
  margin-left: 0.04rem;
}
.keywords {
  font-size: 0.11rem;
  color: var(--gold-dim);
  margin-top: 0.04rem;
}
.core {
  font-size: 0.13rem;
  color: var(--text);
  line-height: 1.85;
  margin-top: 0.08rem;
}
.advice {
  font-size: 0.12rem;
  color: var(--text-2);
  margin-top: 0.08rem;
}
.mini {
  display: inline-block;
  font-size: 0.1rem;
  color: var(--gold-dim);
  margin-right: 0.06rem;
}

.guide {
  font-size: 0.11rem;
  color: var(--text-3);
  margin-top: 0.14rem;
  line-height: 1.8;
}

.acts {
  display: flex;
  gap: 0.1rem;
  margin-top: 0.14rem;
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
.btn.save {
  width: 100%;
  margin-top: 0.1rem;
  font-size: 0.12rem;
  color: var(--text-2);
  border: 1px dashed var(--line);
}
.saved {
  font-size: 0.11rem;
  color: var(--text-3);
  margin-top: 0.1rem;
}

.disclaimer {
  margin-top: 0.22rem;
  text-align: center;
  font-size: 0.09rem;
  color: var(--text-3);
  line-height: 1.8;
}
</style>
