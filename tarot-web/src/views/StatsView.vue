<script setup lang="ts">
// Mirror 统计（03 §3.1 / 09 N4）：全部本地计算，不上传。
// 定位是"照见自己"——最常出现的那张牌，往往就是你反复遇见的那个课题。
import { computed } from 'vue'
import { useHistoryStore } from '@/stores/history'
import { computeStats } from '@/engine/stats'

const historyStore = useHistoryStore()
const stats = computed(() => computeStats(historyStore.readings))
const has = computed(() => stats.value.readings > 0)

const pct = (v: number) => `${Math.round(v * 100)}%`
const maxOf = (list: { count: number }[]) => Math.max(1, ...list.map((x) => x.count))
</script>

<template>
  <div class="page stats">
    <header class="head">
      <router-link to="/" class="back">← 首页</router-link>
      <h1>统计</h1>
      <p class="lead">最常出现的那张牌，往往就是你反复遇见的那个课题。</p>
    </header>

    <template v-if="!has">
      <p class="empty">还没有占卜记录。抽过几次之后，这里会长出你的牌面画像。</p>
    </template>

    <template v-else>
      <section class="grid">
        <div class="cell">
          <span class="num">{{ stats.readings }}</span>
          <span class="lab">次占卜</span>
        </div>
        <div class="cell">
          <span class="num">{{ stats.drawn }}</span>
          <span class="lab">张牌</span>
        </div>
        <div class="cell">
          <span class="num">{{ pct(stats.reversedRate) }}</span>
          <span class="lab">逆位率</span>
        </div>
        <div class="cell">
          <span class="num">{{ stats.spanDays }}</span>
          <span class="lab">天跨度</span>
        </div>
      </section>

      <section v-if="stats.topCards.length" class="block">
        <h2>出现最多的牌</h2>
        <ul class="top">
          <li v-for="(c, i) in stats.topCards" :key="c.cardId">
            <span class="rank">{{ i + 1 }}</span>
            <router-link :to="`/card/${c.cardId}`" class="name">{{ c.nameZh }}</router-link>
            <span class="bar-wrap">
              <span class="bar" :style="{ width: `${(c.count / maxOf(stats.topCards)) * 100}%` }" />
            </span>
            <span class="cnt">{{ c.count }}</span>
          </li>
        </ul>
      </section>

      <section v-if="stats.suitDist.length" class="block">
        <h2>牌组分布</h2>
        <ul class="dist">
          <li v-for="s in stats.suitDist" :key="s.key">
            <span class="key">{{ s.nameZh }}</span>
            <span class="bar-wrap">
              <span class="bar alt" :style="{ width: `${(s.count / maxOf(stats.suitDist)) * 100}%` }" />
            </span>
            <span class="cnt">{{ s.count }}</span>
          </li>
        </ul>
      </section>

      <section v-if="stats.domainDist.length" class="block">
        <h2>你常问的方向</h2>
        <ul class="dist">
          <li v-for="d in stats.domainDist" :key="d.key">
            <span class="key">{{ d.nameZh }}</span>
            <span class="bar-wrap">
              <span class="bar alt" :style="{ width: `${(d.count / maxOf(stats.domainDist)) * 100}%` }" />
            </span>
            <span class="cnt">{{ d.count }}</span>
          </li>
        </ul>
      </section>

      <p class="foot">以上只在这台设备上算出，不上传任何服务器。</p>
    </template>
  </div>
</template>

<style scoped>
.stats {
  padding-bottom: calc(0.3rem + var(--safe-bottom));
}
.head {
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
  font-size: 0.11rem;
  color: var(--text-3);
  margin-top: 0.05rem;
  line-height: 1.8;
}
.empty {
  margin-top: 0.3rem;
  text-align: center;
  font-size: 0.12rem;
  color: var(--text-3);
  line-height: 1.9;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.08rem;
  margin-top: 0.16rem;
}
.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.12rem 0.04rem;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
.num {
  font-family: var(--font-serif);
  font-size: 0.18rem;
  color: var(--gold-bright);
}
.lab {
  font-size: 0.1rem;
  color: var(--text-3);
  margin-top: 0.03rem;
}

.block {
  margin-top: 0.18rem;
}
h2 {
  font-size: 0.13rem;
  margin-bottom: 0.1rem;
}
.top,
.dist {
  list-style: none;
}
.top li,
.dist li {
  display: flex;
  align-items: center;
  gap: 0.08rem;
  padding: 0.06rem 0;
}
.rank {
  width: 0.16rem;
  font-size: 0.11rem;
  color: var(--gold-dim);
}
.name {
  width: 0.72rem;
  flex-shrink: 0;
  font-size: 0.12rem;
  color: var(--text);
}
.key {
  width: 0.78rem;
  flex-shrink: 0;
  font-size: 0.12rem;
  color: var(--text-2);
}
.bar-wrap {
  flex: 1;
  height: 0.06rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  overflow: hidden;
}
.bar {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--gold-dim), var(--gold));
}
.bar.alt {
  background: linear-gradient(90deg, rgba(155, 147, 168, 0.5), var(--text-2));
}
.cnt {
  width: 0.24rem;
  text-align: right;
  font-size: 0.11rem;
  color: var(--text-3);
}

.foot {
  margin-top: 0.2rem;
  text-align: center;
  font-size: 0.09rem;
  color: var(--text-3);
}
</style>
