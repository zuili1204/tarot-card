<script setup lang="ts">
// 学习中心 S7（07 §1.4 / 09 N2）：/learn 目录；/learn/:articleId 正文
// 内容全部来自 data 层（learn.json），视图零硬编码文案
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { learnArticles, learnMap } from '@/data'
import type { LearnArticle } from '@/types'

const route = useRoute()

const id = computed(() => (route.params.articleId as string | undefined) ?? '')
const article = computed<LearnArticle | null>(() => (id.value ? learnMap.get(id.value) ?? null : null))
const pos = computed(() => learnArticles.findIndex((a) => a.id === id.value))
const prev = computed(() => (pos.value > 0 ? learnArticles[pos.value - 1] : null))
const next = computed(() =>
  pos.value >= 0 && pos.value < learnArticles.length - 1 ? learnArticles[pos.value + 1] : null,
)
</script>

<template>
  <div class="page learn">
    <!-- 目录 -->
    <template v-if="!id">
      <header class="head">
        <router-link to="/" class="back">← 首页</router-link>
        <h1>入门三课</h1>
        <p class="lead">十分钟，把「看不懂的牌」变成「看得懂的画面」。</p>
      </header>

      <nav class="toc">
        <router-link
          v-for="(a, i) in learnArticles"
          :key="a.id"
          :to="`/learn/${a.id}`"
          class="toc-item a-fade-up"
          :style="{ '--d': `${0.06 + i * 0.06}s` }"
        >
          <span class="toc-no">{{ i + 1 }}</span>
          <span class="toc-body">
            <span class="toc-title">{{ a.title }}</span>
            <span class="toc-sub">{{ a.subtitle }}</span>
          </span>
          <span class="toc-min">{{ a.minutes }} 分钟</span>
        </router-link>
      </nav>
    </template>

    <!-- 正文 -->
    <template v-else-if="article">
      <header class="head">
        <router-link to="/learn" class="back">← 目录</router-link>
        <h1>{{ article.title }}</h1>
        <p class="sub">{{ article.subtitle }}</p>
        <p class="meta">约 {{ article.minutes }} 分钟</p>
      </header>

      <article class="body">
        <template v-for="(s, i) in article.sections" :key="i">
          <p v-if="s.type === 'lead'" class="s-lead">{{ s.text }}</p>
          <h2 v-else-if="s.type === 'h'" class="s-h">{{ s.text }}</h2>
          <p v-else-if="s.type === 'p'" class="s-p">{{ s.text }}</p>
          <ul v-else-if="s.type === 'list'" class="s-list">
            <li v-for="(it, k) in s.items" :key="k">{{ it }}</li>
          </ul>
          <blockquote v-else-if="s.type === 'quote'" class="s-quote">{{ s.text }}</blockquote>
          <p v-else-if="s.type === 'note'" class="s-note">{{ s.text }}</p>
        </template>
      </article>

      <nav class="pager">
        <router-link v-if="prev" :to="`/learn/${prev.id}`" class="pager-btn">← {{ prev.title }}</router-link>
        <span v-else class="pager-btn empty">已是第一篇</span>
        <router-link v-if="next" :to="`/learn/${next.id}`" class="pager-btn next">{{ next.title }} →</router-link>
        <router-link v-else to="/" class="pager-btn next">读完了，回首页 →</router-link>
      </nav>
    </template>

    <!-- 未知 id -->
    <template v-else>
      <header class="head">
        <router-link to="/learn" class="back">← 目录</router-link>
        <h1>没找到这一篇</h1>
        <p class="lead">它可能还没写出来。回目录看看另外三课。</p>
      </header>
    </template>
  </div>
</template>

<style scoped>
.learn {
  padding-bottom: calc(0.34rem + var(--safe-bottom));
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
  font-size: 0.21rem;
}
.lead,
.sub {
  font-size: 0.12rem;
  color: var(--text-2);
  margin-top: 0.06rem;
  line-height: 1.8;
}
.meta {
  font-size: 0.1rem;
  color: var(--text-3);
  margin-top: 0.04rem;
}

/* 目录 */
.toc {
  margin-top: 0.18rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.toc-item {
  display: flex;
  align-items: center;
  gap: 0.12rem;
  padding: 0.14rem 0.16rem;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
.toc-no {
  flex-shrink: 0;
  width: 0.24rem;
  height: 0.24rem;
  line-height: 0.24rem;
  text-align: center;
  border-radius: 50%;
  border: 1px solid var(--gold-dim);
  color: var(--gold);
  font-size: 0.11rem;
}
.toc-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.toc-title {
  font-family: var(--font-serif);
  font-size: 0.15rem;
  color: var(--gold-bright);
}
.toc-sub {
  font-size: 0.11rem;
  color: var(--text-3);
  margin-top: 0.02rem;
}
.toc-min {
  flex-shrink: 0;
  font-size: 0.1rem;
  color: var(--text-3);
}

/* 正文 */
.body {
  margin-top: 0.16rem;
}
.s-lead {
  font-size: 0.14rem;
  color: var(--text);
  line-height: 1.9;
  padding-left: 0.1rem;
  border-left: 2px solid var(--gold-dim);
}
.s-h {
  font-size: 0.15rem;
  margin-top: 0.2rem;
}
.s-p {
  font-size: 0.13rem;
  color: var(--text);
  line-height: 1.95;
  margin-top: 0.1rem;
}
.s-list {
  margin: 0.1rem 0 0;
  padding-left: 0.18rem;
}
.s-list li {
  font-size: 0.13rem;
  color: var(--text);
  line-height: 1.9;
  margin-bottom: 0.04rem;
}
.s-list li::marker {
  color: var(--gold-dim);
}
.s-quote {
  margin: 0.18rem 0 0;
  padding: 0.12rem 0.14rem;
  font-family: var(--font-serif);
  font-size: 0.14rem;
  color: var(--gold-bright);
  line-height: 1.9;
  background: rgba(212, 175, 55, 0.06);
  border-radius: var(--radius-s);
}
.s-note {
  margin-top: 0.16rem;
  font-size: 0.11rem;
  color: var(--text-3);
  line-height: 1.8;
  padding-top: 0.1rem;
  border-top: 1px dashed rgba(212, 175, 55, 0.2);
}

/* 上下篇 */
.pager {
  display: flex;
  justify-content: space-between;
  gap: 0.1rem;
  margin-top: 0.26rem;
}
.pager-btn {
  flex: 1;
  font-size: 0.12rem;
  color: var(--text-2);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.1rem 0.12rem;
  text-align: center;
}
.pager-btn.next {
  text-align: right;
}
.pager-btn.empty {
  color: var(--text-3);
  border-style: dashed;
}
</style>
