<script setup lang="ts">
// S3 牌义词典：分组浏览 / 搜索 / 正逆位切换（04 §3）
import { computed, ref } from 'vue'
import { SUIT_SECTIONS, cardsOfSuit } from '@/data'
import type { Card } from '@/types'
import CardFace from '@/components/CardFace.vue'

const keyword = ref('')
const showReversed = ref(false)

const kw = computed(() => keyword.value.trim().toLowerCase())

function match(c: Card): boolean {
  if (!kw.value) return true
  const hay = [
    c.nameZh,
    c.nameEn,
    ...c.keywords.up,
    ...c.keywords.rev,
    ...(c.astrology ? [c.astrology] : []),
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(kw.value)
}

const sections = computed(() =>
  SUIT_SECTIONS.map((s) => ({ ...s, cards: cardsOfSuit(s.key).filter(match) })).filter(
    (s) => s.cards.length > 0,
  ),
)

const total = computed(() => sections.value.reduce((n, s) => n + s.cards.length, 0))
</script>

<template>
  <div class="page">
    <header class="lib-head">
      <router-link to="/" class="back" aria-label="返回首页">‹</router-link>
      <h1>词典</h1>
      <span class="count">{{ total }} 张</span>
    </header>

    <p class="intro">七十八张牌，每一张都是一面镜子。</p>

    <div class="toolbar">
      <input v-model="keyword" class="search" type="search" placeholder="搜牌名、关键词、星座…" />
      <div class="toggle">
        <button :class="{ on: !showReversed }" @click="showReversed = false">正位</button>
        <button :class="{ on: showReversed }" @click="showReversed = true">逆位</button>
      </div>
    </div>

    <p v-if="total === 0" class="empty">没有找到「{{ keyword }}」相关的牌。换个词试试？</p>

    <section v-for="s in sections" :key="s.key" class="sect">
      <div class="sect-head">
        <h2>{{ s.nameZh }}</h2>
        <span class="sect-sub">{{ s.sub }}</span>
      </div>
      <div class="grid">
        <router-link
          v-for="(c, i) in s.cards"
          :key="c.id"
          :to="`/card/${c.id}`"
          class="cell a-fade-up"
          :style="{ '--d': `${(i % 9) * 0.028}s` }"
        >
          <CardFace :card="c" :reversed="showReversed" size="sm" />
          <span class="cell-name">{{ c.nameZh }}</span>
          <span class="cell-kw">{{
            (showReversed ? c.keywords.rev : c.keywords.up).slice(0, 2).join(' · ')
          }}</span>
        </router-link>
      </div>
    </section>
  </div>
</template>

<style scoped>
.lib-head {
  display: flex;
  align-items: baseline;
  gap: 0.1rem;
  padding-top: calc(0.06rem + var(--safe-top));
}
.back {
  font-size: 0.26rem;
  color: var(--gold);
  line-height: 1;
  padding: 0 0.06rem;
}
h1 {
  font-size: 0.2rem;
  flex: 1;
}
.count {
  color: var(--text-3);
  font-size: 0.11rem;
}
.intro {
  color: var(--text-2);
  font-size: 0.12rem;
  margin: 0.04rem 0 0.14rem;
}
.toolbar {
  display: flex;
  gap: 0.08rem;
  margin-bottom: 0.18rem;
}
.search {
  flex: 1;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--text);
  font-size: 0.13rem;
  padding: 0.08rem 0.16rem;
}
.search::placeholder {
  color: var(--text-3);
}
.search:focus {
  border-color: var(--gold-dim);
}
.toggle {
  display: flex;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 999px;
  overflow: hidden;
  flex-shrink: 0;
}
.toggle button {
  color: var(--text-2);
  font-size: 0.12rem;
  padding: 0 0.13rem;
}
.toggle button.on {
  color: var(--gold-bright);
  background: rgba(212, 175, 55, 0.12);
}
.empty {
  color: var(--text-2);
  text-align: center;
  padding: 0.6rem 0;
  font-size: 0.13rem;
}
.sect {
  margin-bottom: 0.24rem;
}
.sect-head {
  display: flex;
  align-items: baseline;
  gap: 0.08rem;
  border-bottom: 1px solid var(--line);
  padding-bottom: 0.06rem;
  margin-bottom: 0.12rem;
}
.sect-head h2 {
  font-size: 0.15rem;
}
.sect-sub {
  color: var(--text-3);
  font-size: 0.1rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.1rem;
}
.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.04rem;
}
.cell-name {
  font-size: 0.12rem;
  color: var(--text);
  margin-top: 0.03rem;
}
.cell-kw {
  font-size: 0.1rem;
  color: var(--text-3);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
</style>
