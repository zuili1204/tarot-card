<script setup lang="ts">
// S3 牌面详情：正逆切换 / 三域牌义 / 是与否倾向 / 上下张导航（04 §3）
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cardMap, neighborCards } from '@/data'
import { useTaskStore } from '@/stores/task'
import CardFace from '@/components/CardFace.vue'
import type { YesNo } from '@/types'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()

const card = computed(() => cardMap.get(String(route.params.cardId)))
const reversed = ref(false)

const neighbors = computed(() => (card.value ? neighborCards(card.value.id) : { prev: null, next: null }))

const DOMAIN_LABELS: { key: 'love' | 'career' | 'wealth'; name: string }[] = [
  { key: 'love', name: '爱情' },
  { key: 'career', name: '事业' },
  { key: 'wealth', name: '财运' },
]

const YESNO_LABEL: Record<YesNo, string> = { yes: '倾向「是」', no: '倾向「否」', vague: '看情况' }

function toggleReversed() {
  reversed.value = !reversed.value
}

onMounted(() => {
  if (!card.value) {
    router.replace('/library')
    return
  }
  taskStore.recordViewed(card.value.id)
})
watch(
  () => route.params.cardId,
  (id) => {
    reversed.value = false
    if (id && cardMap.get(String(id))) taskStore.recordViewed(String(id))
  },
)
</script>

<template>
  <div v-if="card" class="page">
    <header class="head">
      <router-link to="/library" class="back" aria-label="返回词典">‹</router-link>
      <h1>{{ card.nameZh }}</h1>
      <span class="head-en">{{ card.nameEn }}</span>
    </header>

    <div class="hero" @click="toggleReversed">
      <CardFace :card="card" :reversed="reversed" size="lg" />
      <span class="hero-hint">{{ reversed ? '逆位 · 点击看正位' : '正位 · 点击看逆位' }}</span>
    </div>

    <div class="meta">
      <span v-if="card.suit === 'major' && card.astrology" class="badge">{{ card.astrology }}</span>
      <span class="badge" :data-el="card.element">{{ card.element }}元素</span>
      <span class="badge" :class="`yn-${card.yesNo}`">{{ YESNO_LABEL[card.yesNo] }}</span>
    </div>

    <div class="chips">
      <span v-for="k in reversed ? card.keywords.rev : card.keywords.up" :key="k" class="chip">{{ k }}</span>
    </div>

    <section class="block">
      <h3>核心牌义</h3>
      <p>{{ reversed ? card.core.rev : card.core.up }}</p>
    </section>

    <section v-for="d in DOMAIN_LABELS" :key="d.key" class="block">
      <h3>{{ d.name }}</h3>
      <p>{{ reversed ? card.domains[d.key].rev : card.domains[d.key].up }}</p>
    </section>

    <section class="block advice">
      <h3>建议</h3>
      <p>{{ card.advice }}</p>
    </section>

    <nav class="pager">
      <router-link v-if="neighbors.prev" :to="`/card/${neighbors.prev.id}`" class="pager-btn">
        ‹ {{ neighbors.prev.nameZh }}
      </router-link>
      <span v-else class="pager-btn ghost">已是第一张</span>
      <router-link v-if="neighbors.next" :to="`/card/${neighbors.next.id}`" class="pager-btn">
        {{ neighbors.next.nameZh }} ›
      </router-link>
      <span v-else class="pager-btn ghost">已是最后一张</span>
    </nav>
  </div>
</template>

<style scoped>
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
.head-en {
  color: var(--text-3);
  font-size: 0.11rem;
  font-style: italic;
}
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.08rem;
  margin: 0.16rem 0 0.12rem;
}
.hero-hint {
  color: var(--text-3);
  font-size: 0.1rem;
}
.meta {
  display: flex;
  justify-content: center;
  gap: 0.08rem;
  margin-bottom: 0.12rem;
}
.badge {
  font-size: 0.1rem;
  color: var(--text-2);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.01rem 0.1rem;
}
.badge[data-el='火'] { color: var(--el-fire); border-color: var(--el-fire); }
.badge[data-el='水'] { color: var(--el-water); border-color: var(--el-water); }
.badge[data-el='风'] { color: var(--el-air); border-color: var(--el-air); }
.badge[data-el='土'] { color: var(--el-earth); border-color: var(--el-earth); }
.yn-yes { color: var(--accent-up); border-color: var(--accent-up); }
.yn-no { color: var(--accent-rev); border-color: var(--accent-rev); }
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.06rem;
  justify-content: center;
  margin-bottom: 0.2rem;
}
.chip {
  font-size: 0.11rem;
  color: var(--gold-bright);
  background: rgba(212, 175, 55, 0.1);
  border-radius: 999px;
  padding: 0.02rem 0.12rem;
}
.block {
  background: var(--panel);
  border: 1px solid rgba(212, 175, 55, 0.12);
  border-radius: var(--radius-s);
  padding: 0.12rem 0.14rem;
  margin-bottom: 0.1rem;
}
.block h3 {
  font-size: 0.13rem;
  color: var(--gold);
  margin-bottom: 0.04rem;
}
.block p {
  color: var(--text);
  font-size: 0.13rem;
  line-height: 1.8;
}
.advice {
  border-color: var(--gold-dim);
  background: linear-gradient(160deg, rgba(212, 175, 55, 0.08), var(--panel));
}
.pager {
  display: flex;
  justify-content: space-between;
  gap: 0.08rem;
  margin-top: 0.16rem;
}
.pager-btn {
  flex: 1;
  text-align: center;
  color: var(--text-2);
  font-size: 0.12rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.07rem 0;
}
.pager-btn.ghost {
  opacity: 0.4;
}
</style>
