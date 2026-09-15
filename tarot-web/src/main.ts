import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
// 字体（思源宋体=标题衬线 / 思源黑体=正文）：fontsource 按 unicode-range 分片，用到哪片加载哪片
// Android 构建下这 4 行会被 vite alias 重定向到系统字体栈占位（09 §10.3-1）
import '@fontsource/noto-serif-sc/400.css'
import '@fontsource/noto-serif-sc/600.css'
import '@fontsource/noto-sans-sc/400.css'
import '@fontsource/noto-sans-sc/500.css'
import './assets/styles/tokens.css'
import './assets/styles/base.css'
import './assets/styles/motion.css'
import { ensureSchema, hydrateStorage } from './platform/storage'
import { applyInsets } from './platform/insets'
import { isLowEndDevice } from './platform/device'
import { installGlobalHandlers } from './platform/log'

// 日志越早装越好：启动阶段的异常也要能捕获（09 N5-3）
installGlobalHandlers()

// 原生启动顺序有依赖：必须先 hydrate 存储镜像，再挂载应用
// —— router 的首启守卫（tarot.onboarding.v1）与各个 store 的初始化都读它
async function bootstrap() {
  await hydrateStorage()
  ensureSchema()
  await applyInsets()
  // 低端机降级（M2）：挂 body.low-end，由各组件自行削减持续动画层
  if (isLowEndDevice()) document.body.classList.add('low-end')
  createApp(App).use(createPinia()).use(router).mount('#app')
}

void bootstrap()
