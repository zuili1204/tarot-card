<script setup lang="ts">
// M2/M3/P1 施工位占位（04 §3 路由表全量登记）
defineProps<{ title?: string; stage?: string }>()
</script>

<template>
  <div class="page ph">
    <div class="ph-card">
      <svg viewBox="0 0 24 24" class="moon">
        <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 1 0 10.5 10.5Z" fill="none" stroke="var(--gold-dim)" stroke-width="1.4" />
      </svg>
      <h1>{{ title ?? '建设中' }}</h1>
      <p>这一部分将在 {{ stage ?? '后续版本' }} 与你见面。</p>
      <router-link to="/" class="home-link">回首页</router-link>
    </div>
  </div>
</template>

<style scoped>
.ph {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ph-card {
  text-align: center;
  padding: 0.4rem 0.3rem;
}
.moon {
  width: 0.4rem;
  margin-bottom: 0.14rem;
  opacity: 0.8;
}
h1 {
  font-size: 0.2rem;
  margin-bottom: 0.08rem;
}
p {
  color: var(--text-2);
  font-size: 0.13rem;
  margin-bottom: 0.2rem;
}
.home-link {
  color: var(--gold);
  font-size: 0.13rem;
  border: 1px solid var(--gold-dim);
  border-radius: 999px;
  padding: 0.06rem 0.24rem;
}
</style>
