<script setup lang="ts">
// 新手任务条（07 §2）：三步全本地状态，完成后由父级收起并 toast
import { computed } from 'vue'
import { rituals } from '@/data'
import { useDailyStore } from '@/stores/daily'
import { useTaskStore } from '@/stores/task'

const taskStore = useTaskStore()
const dailyStore = useDailyStore()

const dailyDone = computed(() => Object.keys(dailyStore.entries).length > 0)

const steps = computed(() => [
  { label: rituals.tasks.step1, done: dailyDone.value, hint: '' },
  { label: rituals.tasks.step2, done: taskStore.threeCardDone, hint: '' },
  {
    label: rituals.tasks.step3,
    done: taskStore.viewedCards.length >= 3,
    hint: `${Math.min(taskStore.viewedCards.length, 3)}/3`,
  },
])
</script>

<template>
  <section class="task-bar">
    <div class="head">
      <span class="title">{{ rituals.tasks.barTitle }}</span>
      <span class="count">{{ steps.filter((s) => s.done).length }}/3</span>
    </div>
    <div class="steps">
      <div v-for="(s, i) in steps" :key="i" class="step" :class="{ done: s.done }">
        <span class="mark">{{ s.done ? '✦' : i + 1 }}</span>
        <span class="label">{{ s.label }}</span>
        <span v-if="s.hint && !s.done" class="hint">{{ s.hint }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.task-bar {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel);
  padding: 0.14rem 0.16rem;
  margin-bottom: 0.14rem;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.08rem;
}
.title {
  font-family: var(--font-serif);
  font-size: 0.13rem;
  color: var(--gold-bright);
}
.count {
  font-size: 0.1rem;
  color: var(--text-3);
}
.steps {
  display: flex;
  flex-direction: column;
  gap: 0.06rem;
}
.step {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  font-size: 0.11rem;
  color: var(--text-2);
}
.step.done {
  color: var(--text-3);
}
.mark {
  width: 0.18rem;
  height: 0.18rem;
  border-radius: 50%;
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.09rem;
  color: var(--text-3);
  flex-shrink: 0;
}
.step.done .mark {
  border-color: var(--gold);
  color: var(--gold);
}
.label {
  flex: 1;
}
.step.done .label {
  text-decoration: line-through;
  text-decoration-color: rgba(212, 175, 55, 0.4);
}
.hint {
  font-size: 0.09rem;
  color: var(--gold);
}
</style>
