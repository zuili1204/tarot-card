import type { CapacitorConfig } from '@capacitor/cli'

// 09-Android端开发规划.md §2.2 / R4 依据：
// - appName 先用英文跑通 M0 链路（中文参数在 PowerShell/Gradle 链路有编码风险，见 R7），M1 改中文应用名
// - androidScheme 显式 https：保证 WebView 处于安全上下文，crypto.getRandomValues 可用（随机性是产品承诺，07 §3.2）
const config: CapacitorConfig = {
  appId: 'com.tarot.app',
  appName: 'Tarot Card',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
