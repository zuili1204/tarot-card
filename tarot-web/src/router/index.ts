import { createRouter, createWebHashHistory } from 'vue-router'
import { storageGet } from '@/platform/storage'
// hash 模式：纯静态托管免服务端回退配置（草稿期最稳；P1 PWA 期再评估 history）

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/library',
      name: 'library',
      component: () => import('@/views/LibraryView.vue'),
    },
    {
      path: '/card/:cardId',
      name: 'card-detail',
      component: () => import('@/views/CardDetailView.vue'),
    },
    // —— 是/否单抽（01 §3.5，09 N1）——
    { path: '/yesno', name: 'yesno', component: () => import('@/views/YesNoView.vue') },
    // —— M2 占卜主链（Ask → Spread → Draw → Result）——
    { path: '/ask', name: 'ask', component: () => import('@/views/AskView.vue') },
    { path: '/spread', name: 'spread', component: () => import('@/views/SpreadView.vue') },
    { path: '/draw', name: 'draw', component: () => import('@/views/DrawView.vue') },
    { path: '/result', name: 'result-draft', component: () => import('@/views/ResultView.vue') },
    { path: '/result/:id', name: 'result', component: () => import('@/views/ResultView.vue') },
    // —— M3 记录与分享（04 §3）——
    { path: '/history', name: 'history', component: () => import('@/views/HistoryView.vue') },
    // —— Mirror 统计（03 §3.1 / 09 N4）——
    { path: '/stats', name: 'stats', component: () => import('@/views/StatsView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/onboarding', name: 'onboarding', component: () => import('@/views/OnboardingView.vue') },
    // —— P1 施工位（04 §3 路由表全量登记，占位防 404）——
    // —— 学习中心 S7（07 §1.4 / 09 N2）：/learn 目录，/learn/:articleId 正文
    { path: '/learn', name: 'learn-index', component: () => import('@/views/LearnView.vue') },
    { path: '/learn/:articleId', name: 'learn', component: () => import('@/views/LearnView.vue') },
    // 兜底
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// S0 首启守卫（04 §3）：onboarding 未完成（tarot.onboarding.v1 不存在）时一律先去 /onboarding
router.beforeEach((to) => {
  if (to.path !== '/onboarding' && !storageGet('tarot.onboarding.v1')) {
    return '/onboarding'
  }
})

export default router
