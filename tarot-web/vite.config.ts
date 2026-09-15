/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 设计基准 390×844 竖屏（04 §1）；静态托管友好：base 相对路径
export default defineConfig(({ mode }) => {
  // Android 构建（npm run build:android）：把 4 个 @fontsource 入口重定向到系统字体栈占位，
  // 剔除 23.4MB 全量中文 webfont（09 §1.2 / R1）
  const isAndroid = mode === 'android'
  const fontStub = (name: string) =>
    fileURLToPath(new URL(`./src/assets/styles/fonts-android/${name}`, import.meta.url))

  return {
    base: './',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        ...(isAndroid
          ? {
              '@fontsource/noto-serif-sc/400.css': fontStub('noto-serif-sc-400.css'),
              '@fontsource/noto-serif-sc/600.css': fontStub('noto-serif-sc-600.css'),
              '@fontsource/noto-sans-sc/400.css': fontStub('noto-sans-sc-400.css'),
              '@fontsource/noto-sans-sc/500.css': fontStub('noto-sans-sc-500.css'),
            }
          : {}),
      },
    },
    build: {
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks: {
            data: ['./src/data/cards.json', './src/data/spreads.json'],
          },
        },
      },
    },
    // Vitest（引擎层单测，04 §8.1）
    test: {
      environment: 'node',
      include: ['tests/**/*.spec.ts'],
    },
  }
})
