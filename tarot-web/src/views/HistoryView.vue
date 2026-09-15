<script setup lang="ts">
// S4 历史页（04 §3）：时间线 + 快照回看 + 删除 + 导出
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { cardMap, rituals, spreadMap } from '@/data'
import { useHistoryStore } from '@/stores/history'
import { useToastStore } from '@/stores/toast'
import type { ReadingSnapshot } from '@/types'

const router = useRouter()
const historyStore = useHistoryStore()
const toast = useToastStore()

const list = computed(() => historyStore.readings)

/** 按本地日期分组（倒序）：{ '09-04': [...] } */
const groups = computed(() => {
  const m = new Map<string, ReadingSnapshot[]>()
  for (const r of list.value) {
    const d = new Date(r.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!m.has(key)) m.set(key, [])
    m.get(key)!.push(r)
  }
  return [...m.entries()]
})

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function spreadName(r: ReadingSnapshot): string {
  return spreadMap.get(r.spreadId)?.nameZh ?? r.spreadId
}
function cardLine(r: ReadingSnapshot): string {
  return r.cards
    .map((d) => `${cardMap.get(d.cardId)?.nameZh ?? d.cardId}${d.reversed ? '◆' : ''}`)
    .join(' · ')
}

/* 删除（确认弹层） */
const pendingDelete = ref<ReadingSnapshot | null>(null)
function doDelete() {
  if (!pendingDelete.value) return
  historyStore.remove(pendingDelete.value.id)
  pendingDelete.value = null
  toast.show('已删除这条记录。')
}

/* 导出（JSON 落盘） */
function exportAll() {
  const blob = new Blob([JSON.stringify({ version: 1, readings: list.value }, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date()
  a.href = url
  a.download = `tarot-history-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="page history">
    <header class="head">
      <h1>历史记录</h1>
      <div class="head-acts">
        <button v-if="list.length" type="button" class="act" @click="exportAll">导出</button>
        <router-link to="/" class="act home">首页</router-link>
      </div>
    </header>

    <p v-if="list.length" class="snapshot-note">{{ rituals.history.snapshotNote }}</p>

    <div v-if="!list.length" class="empty">
      <svg viewBox="0 0 24 24" class="moon">
        <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 1 0 10.5 10.5Z" fill="none" stroke="var(--gold-dim)" stroke-width="1.4" />
      </svg>
      <p>{{ rituals.history.empty }}</p>
      <button type="button" class="btn solid" @click="router.push('/ask')">开始一次占卜</button>
    </div>

    <template v-else>
      <section v-for="[date, items] in groups" :key="date" class="group">
        <h2 class="date">{{ date }}</h2>
        <div v-for="r in items" :key="r.id" class="item">
          <router-link :to="`/result/${r.id}`" class="item-main">
            <p class="q">「{{ r.question.text }}」</p>
            <p class="meta">{{ spreadName(r) }} · {{ r.cards.length }} 张</p>
            <p class="cards">{{ cardLine(r) }}</p>
          </router-link>
          <div class="item-side">
            <span class="time">{{ fmtTime(r.createdAt) }}</span>
            <button type="button" class="del" @click="pendingDelete = r">删除</button>
          </div>
        </div>
      </section>
    </template>

    <!-- 删除确认 -->
    <div v-if="pendingDelete" class="mask" @click.self="pendingDelete = null">
      <div class="dialog">
        <p>删除「{{ pendingDelete.question.text }}」这次占卜？<br />删除后无法找回。</p>
        <div class="dialog-btns">
          <button type="button" class="btn ghost" @click="pendingDelete = null">先留着</button>
          <button type="button" class="btn solid" @click="doDelete">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history {
  padding-top: calc(0.14rem + var(--safe-top));
  padding-bottom: calc(0.3rem + var(--safe-bottom));
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.12rem;
}
h1 {
  font-size: 0.2rem;
}
.head-acts {
  display: flex;
  gap: 0.12rem;
  align-items: center;
}
.act {
  font-size: 0.12rem;
  color: var(--gold);
}
.snapshot-note {
  font-size: 0.1rem;
  color: var(--text-3);
  background: rgba(212, 175, 55, 0.05);
  border: 1px dashed var(--line);
  border-radius: 8px;
  padding: 0.08rem 0.12rem;
  margin-bottom: 0.14rem;
  line-height: 1.7;
}

.empty {
  text-align: center;
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.18rem;
}
.moon {
  width: 0.4rem;
  opacity: 0.8;
}
.empty p {
  color: var(--text-2);
  font-size: 0.12rem;
}

.group {
  margin-bottom: 0.16rem;
}
.date {
  font-size: 0.11rem;
  color: var(--text-3);
  font-weight: 400;
  font-family: var(--font-sans);
  margin-bottom: 0.06rem;
  letter-spacing: 0.04em;
}
.item {
  display: flex;
  gap: 0.08rem;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 0.12rem 0.14rem;
  margin-bottom: 0.07rem;
}
.item-main {
  flex: 1;
  min-width: 0;
}
.q {
  font-size: 0.12rem;
  color: var(--text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta {
  font-size: 0.1rem;
  color: var(--gold);
  margin-top: 0.03rem;
}
.cards {
  font-size: 0.09rem;
  color: var(--text-3);
  margin-top: 0.03rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-side {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  flex-shrink: 0;
}
.time {
  font-size: 0.09rem;
  color: var(--text-3);
}
.del {
  font-size: 0.09rem;
  color: var(--text-3);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.01rem 0.1rem;
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
  width: min(78%, 3.2rem);
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
}
.btn.solid {
  color: #14101f;
  background: linear-gradient(160deg, var(--gold-bright), var(--gold));
}
</style>
