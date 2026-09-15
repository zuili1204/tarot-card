<script setup lang="ts">
// 牌面：public/cards/{id}.jpg（05 §6.1）。逆位整画倒转 180°
import { computed } from 'vue'
import type { Card } from '@/types'

const props = withDefaults(
  defineProps<{ card: Card; reversed?: boolean; size?: 'sm' | 'md' | 'lg' }>(),
  { reversed: false, size: 'sm' },
)

const src = computed(() => import.meta.env.BASE_URL + 'cards/' + props.card.image)
</script>

<template>
  <div class="face" :class="[size, { reversed }]">
    <!-- 无障碍：读屏应能听出正逆位（09 N5-6） -->
    <img
      class="art"
      :src="src"
      :alt="card.nameZh + (reversed ? '（逆位）' : '（正位）')"
      loading="lazy"
      draggable="false"
    />
  </div>
</template>

<style scoped>
.face {
  aspect-ratio: 7 / 12;
  border-radius: 8px;
  border: 1px solid var(--line);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  position: relative;
  background: var(--panel);
}
/* 金色内发丝线，压在原图边框上与全局气质统一 */
.face::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid rgba(212, 175, 55, 0.18);
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
.face.reversed .art {
  transform: rotate(180deg);
}

/* 尺寸 */
.sm {
  width: 100%;
}
.md {
  width: 52%;
}
.lg {
  width: 64%;
}
</style>
