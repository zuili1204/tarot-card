<script setup lang="ts">
// S0 首启引导（07 §1.1）：3 屏定稿文案，任意屏可跳过；完成/跳过都落 done，绝不二次打扰
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { cardMap, rituals } from '@/data'
import CardFace from '@/components/CardFace.vue'
import { storageSet } from '@/platform/storage'

const router = useRouter()

const slides = rituals.onboarding.slides
// 每屏一张示意牌：愚者（启程）/ 权杖王牌（行动）/ 女祭司（向内看）
const DEMO_CARDS = ['major-0', 'wands-ace', 'major-2']

const idx = ref(0)

function finish(skipped: boolean) {
  storageSet(
    'tarot.onboarding.v1',
    JSON.stringify({ done: true, skipped, at: new Date().toISOString() }),
  )
  router.replace('/')
}
function next() {
  if (idx.value < slides.length - 1) idx.value++
  else finish(false)
}
</script>

<template>
  <div class="page onboarding">
    <button type="button" class="skip" @click="finish(true)">{{ rituals.onboarding.skip }}</button>

    <transition name="slide" mode="out-in">
      <div :key="idx" class="slide">
        <div class="ob-card a-float">
          <CardFace :card="cardMap.get(DEMO_CARDS[idx])!" size="sm" />
        </div>
        <h1>{{ slides[idx].title }}</h1>
        <p class="text">{{ slides[idx].text }}</p>
      </div>
    </transition>

    <div class="dots">
      <span v-for="i in slides.length" :key="i" class="dot" :class="{ on: i - 1 === idx }" />
    </div>

    <button type="button" class="btn solid" @click="next">
      {{ idx < slides.length - 1 ? rituals.onboarding.next : rituals.onboarding.start }}
    </button>
  </div>
</template>

<style scoped>
.onboarding {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.36rem calc(0.4rem + var(--safe-bottom));
  position: relative;
}
.skip {
  position: absolute;
  top: calc(0.16rem + var(--safe-top));
  right: 0.2rem;
  font-size: 0.12rem;
  color: var(--text-3);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.04rem 0.16rem;
}
.slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: fadeUp 0.4s ease both;
}
.ob-card {
  width: 52%;
}
h1 {
  font-size: 0.22rem;
  margin-top: 0.3rem;
}
.text {
  color: var(--text-2);
  font-size: 0.13rem;
  line-height: 1.9;
  margin-top: 0.12rem;
  max-width: 2.8rem;
}
.dots {
  display: flex;
  gap: 0.08rem;
  margin: 0.36rem 0 0.24rem;
}
.dot {
  width: 0.05rem;
  height: 0.05rem;
  border-radius: 50%;
  background: var(--line);
  transition: background 0.2s ease;
}
.dot.on {
  background: var(--gold);
  animation: dotPulse 1.6s ease-in-out infinite;
}
@keyframes dotPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
}
.btn {
  font-size: 0.14rem;
  border-radius: 999px;
  padding: 0.12rem 0.5rem;
}
.btn.solid {
  color: #14101f;
  background: linear-gradient(160deg, var(--gold-bright), var(--gold));
}
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(0.24rem);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-0.24rem);
}
</style>
