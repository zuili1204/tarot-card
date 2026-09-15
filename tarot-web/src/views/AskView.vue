<script setup lang="ts">
// S2-1 提问页（04 §3）：问题 / 域 / 时效；场景识别推荐 + 封闭式问题改写提示（08 吸收点 #2）
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { rituals, scenarioMap, scenarios, subScenariosByParent } from '@/data'
import { matchScenario } from '@/engine/match'
import { useReadingStore } from '@/stores/reading'
import type { DomainKey } from '@/types'

const router = useRouter()
const readingStore = useReadingStore()

/** 常用 5 域（10 §6.3：同级选项控制在 7±2，避免一屏铺满十个标签） */
const PRIMARY_DOMAINS: { key: DomainKey; label: string }[] = [
  { key: 'love', label: '感情' },
  { key: 'career', label: '事业' },
  { key: 'wealth', label: '财运' },
  { key: 'study', label: '学业' },
  { key: 'growth', label: '自我成长' },
]
/** 其余域收进「更多」 */
const MORE_DOMAINS: { key: DomainKey; label: string }[] = [
  { key: 'family', label: '家庭' },
  { key: 'social', label: '人际' },
  { key: 'wellbeing', label: '身心状态' },
  { key: 'place', label: '居住安置' },
  { key: 'create', label: '创作表达' },
]
const TIMEFRAMES: { value: 1 | 3 | 6; label: string }[] = [
  { value: 1, label: '1 个月' },
  { value: 3, label: '3 个月' },
  { value: 6, label: '6 个月' },
]

const text = ref('')
const domain = ref<DomainKey | null>(null)
const timeframe = ref<1 | 3 | 6>(3)
const showMore = ref(false)
const showPicker = ref(false)
/** 手动选定的场景（覆盖自动识别，10 §6.1 选择兜底） */
const pickedScenarioId = ref<string | null>(null)
/** 选定的子情境；null = 不细分（Q19 子情境可选） */
const subScenarioId = ref<string | null>(null)

onMounted(() => {
  // 从选阵页返回时保留已填内容
  const q = readingStore.question
  if (q) {
    text.value = q.text
    domain.value = q.domain
    timeframe.value = q.timeframeMonths
    showMore.value = MORE_DOMAINS.some((d) => d.key === q.domain)
  }
})

/** 自动识别（10 §6.1）：问法 → 关键词 → 同义词，多命中按 weight + 同域加成排序 */
const match = computed(() => matchScenario(text.value, domain.value))

/** 最终生效场景：手动选择 > 自动识别 */
const activeScenario = computed(() => {
  if (pickedScenarioId.value) return scenarioMap.get(pickedScenarioId.value) ?? null
  return match.value.scenario
})

/** 可挑选的场景：有识别候选用它；一个都没命中时退回该域下的全部场景 */
const pickableScenarios = computed(() => {
  if (match.value.candidates.length) return match.value.candidates
  if (domain.value) return scenarios.filter((s) => s.basedOn === domain.value)
  return []
})

/** 当前场景下的子情境（10 §5.2：无牌义，只换开场 / 收束 / 推荐阵） */
const subOptions = computed(() =>
  activeScenario.value ? subScenariosByParent[activeScenario.value.id] ?? [] : [],
)

const moreOn = computed(() => MORE_DOMAINS.some((d) => d.key === domain.value))

/** 场景来源变化：手动选定则清空子情境，自动识别则带上识别到的子情境 */
watch(
  () => [match.value.scenario?.id, match.value.subScenario?.id, pickedScenarioId.value],
  () => {
    subScenarioId.value = pickedScenarioId.value ? null : match.value.subScenario?.id ?? null
  },
)

function pickScenario(id: string) {
  pickedScenarioId.value = pickedScenarioId.value === id ? null : id
  subScenarioId.value = null
  showPicker.value = false
}

/** 未命中场景且疑似封闭式问题时，提示改写（taluo 吸收：开放式问题优于是否题） */
const closedQuestion = computed(() => {
  const q = text.value.trim()
  if (!q || activeScenario.value) return false
  return /(会不会|能不能|是不是|有没有|行不行|可以吗|对不对)/.test(q) || /吗[？?]?\s*$/.test(q)
})

const canStart = computed(() => text.value.trim().length >= 2 && domain.value !== null)

function start() {
  if (!canStart.value || !domain.value) return
  readingStore.setQuestion({
    text: text.value.trim(),
    domain: domain.value,
    timeframeMonths: timeframe.value,
    scenarioId: activeScenario.value?.id,
    subScenarioId: subScenarioId.value ?? undefined,
  })
  router.push('/spread')
}
</script>

<template>
  <div class="page ask">
    <header class="head">
      <router-link to="/" class="back" aria-label="返回首页">‹</router-link>
      <h1>问牌</h1>
    </header>

    <p class="lead">{{ rituals.ask.enter }}</p>

    <textarea
      v-model="text"
      class="q-input"
      rows="3"
      maxlength="60"
      :placeholder="rituals.ask.placeholder"
    />

    <div v-if="closedQuestion" class="rewrite">
      <p>{{ rituals.ask.rewriteHint }}</p>
      <div class="rewrite-examples">
        <button v-for="e in rituals.ask.rewriteExamples" :key="e" type="button" class="example" @click="text = e">
          {{ e }}
        </button>
      </div>
    </div>

    <div v-if="activeScenario" class="scenario-hint">
      {{ rituals.ask.scenarioHint.replace('{scenario}', activeScenario.nameZh) }}
      <button type="button" class="pick" @click="showPicker = !showPicker">{{ rituals.ask.scenarioPick }}</button>
    </div>
    <div v-else-if="pickableScenarios.length && text.trim().length >= 4" class="scenario-hint">
      <button type="button" class="pick" @click="showPicker = !showPicker">{{ rituals.ask.scenarioPickHint }}</button>
    </div>

    <!-- 选择兜底（10 §6.1）：识别未命中或命中不准时，手动挑一个 -->
    <div v-if="showPicker" class="picker">
      <p class="picker-lead">{{ rituals.ask.scenarioPickHint }}</p>
      <div class="chips">
        <button
          v-for="s in pickableScenarios"
          :key="s.id"
          type="button"
          class="chip"
          :class="{ on: activeScenario?.id === s.id }"
          @click="pickScenario(s.id)"
        >
          {{ s.nameZh }}
        </button>
      </div>
    </div>

    <!-- 子情境：可选、可跳过（10 §5.2 / Q19） -->
    <section v-if="activeScenario && subOptions.length" class="field">
      <h3>{{ rituals.ask.subHint }}</h3>
      <div class="chips">
        <button type="button" class="chip" :class="{ on: subScenarioId === null }" @click="subScenarioId = null">
          {{ rituals.ask.subSkip }}
        </button>
        <button
          v-for="s in subOptions"
          :key="s.id"
          type="button"
          class="chip"
          :class="{ on: subScenarioId === s.id }"
          @click="subScenarioId = s.id"
        >
          {{ s.nameZh }}
        </button>
      </div>
    </section>

    <section class="field">
      <h3>{{ rituals.ask.domainHint }}</h3>
      <div class="chips">
        <button
          v-for="d in PRIMARY_DOMAINS"
          :key="d.key"
          type="button"
          class="chip"
          :class="{ on: domain === d.key }"
          @click="domain = d.key"
        >
          {{ d.label }}
        </button>
        <button type="button" class="chip" :class="{ on: moreOn }" @click="showMore = !showMore">
          {{ showMore ? '收起' : '更多' }}
        </button>
      </div>
      <div v-if="showMore" class="chips more">
        <button
          v-for="d in MORE_DOMAINS"
          :key="d.key"
          type="button"
          class="chip"
          :class="{ on: domain === d.key }"
          @click="domain = d.key"
        >
          {{ d.label }}
        </button>
      </div>
    </section>

    <section class="field">
      <h3>{{ rituals.ask.timeframeHint }}</h3>
      <div class="chips">
        <button
          v-for="t in TIMEFRAMES"
          :key="t.value"
          type="button"
          class="chip"
          :class="{ on: timeframe === t.value }"
          @click="timeframe = t.value"
        >
          {{ t.label }}
        </button>
      </div>
    </section>

    <button class="start" :disabled="!canStart" @click="start">{{ rituals.ask.start }}</button>
  </div>
</template>

<style scoped>
.ask {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding-bottom: calc(0.24rem + var(--safe-bottom));
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
.lead {
  color: var(--text-2);
  font-size: 0.12rem;
  margin: 0.1rem 0 0.12rem;
}
.q-input {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 0.14rem;
  line-height: 1.7;
  padding: 0.12rem 0.14rem;
  resize: none;
}
.q-input:focus {
  border-color: var(--gold-dim);
}
.q-input::placeholder {
  color: var(--text-3);
}
.rewrite {
  margin-top: 0.1rem;
  background: rgba(212, 175, 55, 0.06);
  border: 1px dashed var(--gold-dim);
  border-radius: var(--radius-s);
  padding: 0.1rem 0.12rem;
}
.rewrite p {
  font-size: 0.11rem;
  color: var(--text-2);
  margin-bottom: 0.08rem;
}
.rewrite-examples {
  display: flex;
  flex-direction: column;
  gap: 0.06rem;
}
.example {
  text-align: left;
  color: var(--gold-bright);
  font-size: 0.12rem;
  background: none;
  border: none;
  padding: 0;
}
.example::before {
  content: '↪ ';
  color: var(--gold-dim);
}
.scenario-hint {
  margin-top: 0.1rem;
  font-size: 0.11rem;
  color: var(--gold-bright);
  background: rgba(212, 175, 55, 0.08);
  border-radius: 999px;
  padding: 0.05rem 0.14rem;
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 0.1rem;
}
.pick {
  color: var(--gold-bright);
  font-size: 0.11rem;
  background: none;
  border: none;
  border-bottom: 1px dashed var(--gold-dim);
  padding: 0;
}
.picker {
  margin-top: 0.08rem;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius-s);
  padding: 0.1rem 0.12rem;
}
.picker-lead {
  font-size: 0.11rem;
  color: var(--text-2);
  margin-bottom: 0.08rem;
}
.chips.more {
  margin-top: 0.08rem;
}
.field {
  margin-top: 0.18rem;
}
.field h3 {
  font-size: 0.12rem;
  color: var(--text-2);
  font-weight: normal;
  margin-bottom: 0.08rem;
}
.chips {
  display: flex;
  gap: 0.08rem;
  flex-wrap: wrap;
}
.chip {
  color: var(--text-2);
  font-size: 0.13rem;
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 999px;
  padding: 0.07rem 0.2rem;
}
.chip.on {
  color: var(--gold-bright);
  border-color: var(--gold);
  background: rgba(212, 175, 55, 0.1);
}
.start {
  margin-top: auto;
  padding-top: 0.3rem;
}
.start {
  font-family: var(--font-serif);
  font-size: 0.16rem;
  color: #14101f;
  background: linear-gradient(160deg, var(--gold-bright), var(--gold));
  border: none;
  border-radius: 999px;
  padding: 0.13rem 0;
  text-align: center;
}
.start:disabled {
  opacity: 0.35;
}
</style>
