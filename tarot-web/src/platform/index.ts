import { Capacitor } from '@capacitor/core'

/** 是否运行在 Capacitor 原生容器内（Android/iOS） */
export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

export function platformName(): string {
  return Capacitor.getPlatform()
}
