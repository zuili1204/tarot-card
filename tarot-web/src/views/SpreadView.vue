<script setup lang="ts">
// S2-2 选阵页（04 §3）：按域过滤 + 三元信息（牌数/难度/时长，08 吸收点 #1）+ 怎么读折叠 + 软门槛
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { rituals, spreads, subScenarioMap } from '@/data'
import { useReadingStore } from '@/stores/reading'
import { useTaskStore } from '@/stores/task'
import type { Spread } from '@/types'

const router = useRouter()
const readingStore = useReadingStore()
const taskStore = useTaskStore()

const DIFF_LABEL: Record<Spread['difficulty'], string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '深度',
}
const LINK_LABEL: Record<string, string> = {
  cause: '因果',
  mirror: '镜像',
  contrast: '对照',
  trend: '走势',
}

const expandedId = ref<string | null>(null)
const confirmSpread = ref<Spread | null>(null)

onMounted(() => {
  if (!readingStore.question) router.replace('/ask')
})

/** 子情境推荐的牌阵（10 §5.2）：只置顶并标记，不自动选中——选择权留给用户 */
const recommendedId = computed(() => {
  const sid = readingStore.question?.subScenarioId
  return sid ? subScenarioMap.get(sid)?.spreadHint ?? null : null
})

const list = computed(() => {
  const d = readingStore.question?.domain ?? 'love'
  const rec = recommendedId.value
  return spreads
    // 只列深度占卜入口的牌阵：是/否单抽有自己的页面（09 N1）
    .filter((s) => s.entry !== 'yesno' && s.domains.includes(d))
    .sort((a, b) => {
      if (rec && a.id === rec) return -1
      if (rec && b.id === rec) return 1
      return a.cardCount - b.cardCount
    })
})

function toggle(s: Spread) {
  expandedId.value = expandedId.value === s.id ? null : s.id
}

function choose(s: Spread) {
  // 软门槛（07 §2）：进阶/深度阵在解锁前确认一次，允许继续
  if (!taskStore.unlockedAdvanced && s.difficulty !== 'beginner') {
    confirmSpread.value = s
    return
  }
  go(s)
}

function go(s: Spread) {
  confirmSpread.value = null
  readingStore.setSpread(s.id)
  router.push('/draw')
}

const confirmText = computed(() =>
  confirmSpread.value
    ? rituals.tasks.advancedConfirm
        .replace('{n}', String(confirmSpread.value.cardCount))
        .replace('{minutes}', String(confirmSpread.value.minutes))
    : '',
)
</script>

<template>
  <div class="page spread">
    <header class="head">
      <router-link to="/ask" class="back" aria-label="返回提问">‹</router-link>
      <h1>选牌阵</h1>
    </header>

    <p class="q-echo">「{{ readingStore.question?.text }}」</p>

    <article v-for="s in list" :key="s.id" class="card" :class="{ open: expandedId === s.id }">
      <div class="card-main" @click="choose(s)">
        <h2>{{ s.nameZh }}<span v-if="s.id === recommendedId" class="rec">推荐</span></h2>
        <p class="desc">{{ s.description }}</p>
        <div class="meta">
          <span>{{ s.cardCount }} 张牌</span>
          <span class="dot">·</span>
          <span>{{ DIFF_LABEL[s.difficulty] }}</span>
          <span class="dot">·</span>
          <span>约 {{ s.minutes }} 分钟</span>
        </div>
      </div>
      <button type="button" class="how-toggle" @click.stop="toggle(s)">
        怎么读 {{ expandedId === s.id ? '▲' : '▼' }}
      </button>
      <div v-if="expandedId === s.id" class="how">
        <p v-for="p in s.positions" :key="p.no" class="how-pos">
          <b>{{ p.no }} · {{ p.name }}</b>{{ p.meaning }}
        </p>
        <p v-if="s.links.length" class="how-links">
          关联：{{ s.links.map((l) => `${l.a}↔${l.b}（${LINK_LABEL[l.type] ?? l.type}）`).join('，') }}
        </p>
      </div>
    </article>

    <div v-if="confirmSpread" class="mask" @click.self="confirmSpread = null">
      <div class="dialog">
        <p>{{ confirmText }}</p>
        <div class="dialog-btns">
          <button type="button" class="btn ghost" @click="confirmSpread = null">再想想</button>
          <button type="button" class="btn solid" @click="go(confirmSpread)">开始</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spread {
  padding-bottom: calc(0.3rem + var(--safe-bottom));
}
/* 子情境推荐牌阵的标记（10 §5.2）：只提示，不代替用户选择 */
.rec {
  display: inline-block;
  margin-left: 0.06rem;
  font-size: 0.09rem;
  color: var(--gold-bright);
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid var(--gold-dim);
  border-radius: 999px;
  padding: 0 0.06rem;
  vertical-align: middle;
}
.head {
  display: flex;
  align-items: baseline;
  gap: 0.1rem;
  padding-top: calc(0.06rem + var(--safe-top));
}
.back {
  font-size: 0.26rem;
  color: var(--gold);
  line-height: 1;
}
h1 {
  font-size: 0.2rem;
}
.q-echo {
  color: var(--text-3);
  font-size: 0.11rem;
  margin: 0.08rem 0 0.14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 0.14rem 0.16rem;
  margin-bottom: 0.12rem;
}
.card.open {
  border-color: var(--gold-dim);
}
.card-main {
  cursor: pointer;
}
h2 {
  font-family: var(--font-serif);
  font-size: 0.16rem;
  color: var(--gold-bright);
}
.desc {
  color: var(--text-2);
  font-size: 0.12rem;
  line-height: 1.7;
  margin: 0.04rem 0 0.08rem;
}
.meta {
  display: flex;
  gap: 0.05rem;
  color: var(--text-3);
  font-size: 0.1rem;
}
.dot {
  color: var(--line);
}
.how-toggle {
  margin-top: 0.08rem;
  background: none;
  border: none;
  color: var(--gold);
  font-size: 0.11rem;
  padding: 0;
}
.how {
  margin-top: 0.1rem;
  border-top: 1px dashed var(--line);
  padding-top: 0.1rem;
}
.how-pos {
  font-size: 0.11rem;
  color: var(--text-2);
  line-height: 1.8;
}
.how-pos b {
  color: var(--text);
  font-weight: normal;
  margin-right: 0.08rem;
}
.how-links {
  font-size: 0.1rem;
  color: var(--text-3);
  margin-top: 0.06rem;
}
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}
.dialog {
  width: min(78%, 3.2rem); /* fixed 弹层不在 420px 列内，上限防桌面拉宽 */
  background: var(--panel);
  border: 1px solid var(--gold-dim);
  border-radius: var(--radius);
  padding: 0.2rem 0.18rem;
  text-align: center;
}
.dialog p {
  font-size: 0.13rem;
  color: var(--text);
  line-height: 1.8;
  margin-bottom: 0.16rem;
}
.dialog-btns {
  display: flex;
  gap: 0.1rem;
}
.btn {
  flex: 1;
  font-size: 0.13rem;
  border-radius: 999px;
  padding: 0.09rem 0;
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
</style>
