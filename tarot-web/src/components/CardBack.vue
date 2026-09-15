<script setup lang="ts">
// 牌背：public/cards/back.png（05 §6.1）
withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'sm' })

const backSrc = import.meta.env.BASE_URL + 'cards/back.png'
</script>

<template>
  <div class="back" :class="size">
    <img class="art" :src="backSrc" alt="" draggable="false" />
  </div>
</template>

<style scoped>
.back {
  position: relative;
  aspect-ratio: 7 / 12;
  border-radius: 8px;
  border: 1px solid var(--line);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  background: radial-gradient(120% 90% at 50% 30%, #1d2140 0%, #141830 55%, #0f1226 100%);
}
.back::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid rgba(212, 175, 55, 0.16);
  border-radius: 7px;
  pointer-events: none;
  z-index: 1;
}
.art {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.sm {
  width: 100%;
}
.md {
  width: 46%;
}
</style>
