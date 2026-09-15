<script setup lang="ts">
// 设置页（04 §3 M3）：逆位开关 / 音效（P1 预留）/ 数据导出导入 / 关于随机性（07 §3.2 定稿全文）
import { computed, ref } from 'vue'
import { rituals } from '@/data'
import { useDailyStore } from '@/stores/daily'
import { useHistoryStore } from '@/stores/history'
import { useSettingsStore } from '@/stores/settings'
import { useAiStore } from '@/stores/ai'
import { useTaskStore } from '@/stores/task'
import { useToastStore } from '@/stores/toast'
import { AI_PRESETS, validateAiConfig } from '@/platform/aiStore'
import { describeAiError, requestChat } from '@/engine/ai'
import { playFlip, unlockAudio } from '@/platform/sound'
import { shareText } from '@/platform/share'
import { dumpLog, logError } from '@/platform/log'
import { ensureNotifyPermission } from '@/platform/notify'

const settingsStore = useSettingsStore()
const historyStore = useHistoryStore()
const dailyStore = useDailyStore()
const taskStore = useTaskStore()
const toast = useToastStore()
const aiStore = useAiStore()

/* ---------- AI 深度解读（S5 / 11-AI深度解读开发规划） ---------- */
const testing = ref(false)
const showKey = ref(false)
/** 备份是否带出 AI 配置：默认**不带**——配置含密钥（11 §7.2 / R3） */
const includeAiInBackup = ref(false)

function onProviderChange() {
  const p = AI_PRESETS.find((x) => x.key === aiStore.state.provider)
  if (p && p.key !== 'custom') aiStore.applyPreset(p.baseUrl, p.model)
  else aiStore.applyPreset('', '')
}

/**
 * 测试连接：一次很小但**能真正走完一整轮**的请求（64 token）。
 * 2026-09-13：原来给 8 token，推理/带思考链的模型会被 max_tokens 截断，
 * content 为空 → 报"返回内容不是预期格式"，看着像协议不兼容，其实是配额给太少。
 */
async function testConnection() {
  if (testing.value) return
  const err = validateAiConfig(aiStore.state)
  if (err) {
    toast.show(err)
    return
  }
  testing.value = true
  const t0 = performance.now()
  try {
    const res = await requestChat(
      { ...aiStore.state, enabled: true, maxTokens: 256 },
      [{ role: 'user', content: '回复两个字：收到' }],
      // 只要结构正确就算通：带思考链的模型在 256 token 内可能还没输出正文
      { timeoutMs: 20000, allowEmpty: true },
    )
    aiStore.state.lastTest = {
      ok: true,
      at: new Date().toISOString(),
      model: res.model,
      ms: Math.round(performance.now() - t0),
    }
  } catch (e) {
    const text = describeAiError(e, rituals.ai.err)
    logError(`[ai] 测试连接失败 :: ${text}`)
    aiStore.state.lastTest = { ok: false, at: new Date().toISOString(), message: text }
  } finally {
    testing.value = false
  }
}

function clearAi() {
  if (!window.confirm(rituals.ai.clearConfirm)) return
  aiStore.clear()
  toast.show('已清除 AI 配置。')
}

/* 回顾提醒：开启时才申请权限，被拒也不二次打扰（09 N4） */
async function toggleHindsight() {
  const next = !settingsStore.state.hindsight
  if (next) {
    const ok = await ensureNotifyPermission()
    if (!ok) {
      toast.show('还没有通知权限，可在系统设置里打开后再试。')
      return
    }
  }
  settingsStore.state.hindsight = next
}

/* 音效开关：开启时先解锁 AudioContext 再试听。
   2026-09-13 修：解锁与发声都是异步的（resume() 异步），旧的同 tick 写法会让首次点击静默无声，
   表现成"点了没反应"。现在无论成功与否都给一次 toast，点击必有回响。 */
async function toggleSound() {
  const next = !settingsStore.state.sound
  settingsStore.state.sound = next
  if (!next) {
    toast.show('音效已关闭。')
    return
  }
  const ok = await unlockAudio()
  if (!ok) {
    toast.show('已开启，但这台设备当前播不出声音。')
    return
  }
  await playFlip()
  toast.show('音效已开启——刚才那声是翻牌音。')
}

/* 全量导出：readings + daily + tasks + settings */
async function exportAll() {
  const payload = {
    app: 'tarot-card',
    version: 1,
    exportedAt: new Date().toISOString(),
    readings: historyStore.readings,
    daily: { version: 1, days: dailyStore.entries },
    tasks: {
      viewedCards: taskStore.viewedCards,
      sawDrawTips: taskStore.sawDrawTips,
      unlockedAdvanced: taskStore.unlockedAdvanced,
      threeCardDone: taskStore.threeCardDone,
      finishedAt: taskStore.finishedAt,
    },
    settings: settingsStore.state,
    // AI 配置含密钥：默认不进备份，避免随手分享的 JSON 外泄（11 §7.2 / R3）
    ...(includeAiInBackup.value ? { ai: aiStore.state } : {}),
  }
  const d = new Date()
  const name = `tarot-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`
  // native 走系统分享面板（零权限），web 走下载（09 Q6）
  const r = await shareText(JSON.stringify(payload, null, 2), name)
  toast.show(r.ok ? '已导出备份文件。' : `导出失败：${r.error ?? '未知原因'}`)
}

/* 诊断日志（09 N5-3）：真机出问题时唯一的线索来源。
   分享面板在某些 ROM 上不可靠，所以**同时提供屏幕内查看 + 复制**，保证一定能拿到。 */
const showLog = ref(false)
const logText = computed(() => dumpLog())

async function exportLog() {
  const r = await shareText(logText.value || rituals.ai.logEmpty, `tarot-log-${Date.now()}.txt`)
  if (!r.ok) {
    showLog.value = true // 分享不通就直接在屏幕上摊开，不让人卡死在"重试"
    toast.show(`日志分享失败（${r.error ?? '未知原因'}）——已改为在页面里显示，可直接复制。`)
  }
}

async function copyLog() {
  try {
    await navigator.clipboard.writeText(logText.value || rituals.ai.logEmpty)
    toast.show(rituals.ai.logCopied)
  } catch {
    toast.show('复制失败，请长按选中文本手动复制。')
  }
}

/* 导入（保守）：只回历史记录，按 id 去重 */
const fileInput = ref<HTMLInputElement | null>(null)
function pickImport() {
  fileInput.value?.click()
}
function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 允许重复选同一文件
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result))
      const added = historyStore.importReadings(data?.readings ?? (Array.isArray(data) ? data : []))
      toast.show(added ? `已导入 ${added} 条占卜记录。` : '没有可导入的新记录。')
    } catch {
      toast.show('文件解析失败——请选择本应用导出的备份文件。')
    }
  }
  reader.readAsText(file)
}
</script>

<template>
  <div class="page settings">
    <header class="head">
      <h1>设置</h1>
      <router-link to="/" class="act home">首页</router-link>
    </header>

    <!-- 占卜 -->
    <section class="group">
      <h2>占卜</h2>
      <div class="row">
        <div class="row-text">
          <p class="row-title">逆位牌</p>
          <p class="row-sub">{{ settingsStore.state.reversed ? rituals.settings.reversedOn : rituals.settings.reversedOff }}</p>
        </div>
        <button
          type="button"
          class="switch"
          :class="{ on: settingsStore.state.reversed }"
          @click="settingsStore.state.reversed = !settingsStore.state.reversed"
        >
          <span class="knob" />
        </button>
      </div>
      <div class="row">
        <div class="row-text">
          <p class="row-title">音效</p>
          <p class="row-sub">洗牌与翻牌的环境音（实时合成，无音频素材）</p>
        </div>
        <button type="button" class="switch" :class="{ on: settingsStore.state.sound }" @click="toggleSound">
          <span class="knob" />
        </button>
      </div>
      <div class="row">
        <div class="row-text">
          <p class="row-title">回顾提醒</p>
          <p class="row-sub">保存占卜 3 天后，提醒你回来对照一下</p>
        </div>
        <button type="button" class="switch" :class="{ on: settingsStore.state.hindsight }" @click="toggleHindsight">
          <span class="knob" />
        </button>
      </div>
    </section>

    <!-- AI 深度解读（S5 / 11 §8.1） -->
    <section class="group">
      <h2>{{ rituals.ai.groupTitle }}</h2>
      <p class="group-note">{{ rituals.ai.groupNote }}</p>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ rituals.ai.enable }}</p>
          <p class="row-sub">{{ rituals.ai.enableSub }}</p>
        </div>
        <button
          type="button"
          class="switch"
          :class="{ on: aiStore.state.enabled }"
          @click="aiStore.state.enabled = !aiStore.state.enabled"
        >
          <span class="knob" />
        </button>
      </div>

      <p v-if="!aiStore.state.enabled" class="ai-offline">{{ rituals.ai.offline }}</p>

      <div v-else class="ai-form">
        <label class="field">
          <span>{{ rituals.ai.provider }}</span>
          <select v-model="aiStore.state.provider" class="input" @change="onProviderChange">
            <option v-for="p in AI_PRESETS" :key="p.key" :value="p.key">{{ p.label }}</option>
          </select>
        </label>

        <label class="field">
          <span>{{ rituals.ai.baseUrl }}</span>
          <input v-model="aiStore.state.baseUrl" class="input" type="text" :placeholder="rituals.ai.baseUrlHint" />
        </label>

        <label class="field">
          <span>{{ rituals.ai.apiKey }}</span>
          <span class="key-row">
            <input
              v-model="aiStore.state.apiKey"
              class="input"
              :type="showKey ? 'text' : 'password'"
              :placeholder="rituals.ai.apiKeyPlaceholder"
              autocomplete="off"
            />
            <button type="button" class="btn ghost tiny" @click="showKey = !showKey">
              {{ showKey ? '隐藏' : '显示' }}
            </button>
          </span>
        </label>

        <label class="field">
          <span>{{ rituals.ai.model }}</span>
          <input v-model="aiStore.state.model" class="input" type="text" />
          <span class="field-hint">{{ rituals.ai.modelHint }}</span>
        </label>

        <details class="adv">
          <summary>{{ rituals.ai.advanced }}</summary>
          <label class="field">
            <span>{{ rituals.ai.temperature }} · {{ aiStore.state.temperature.toFixed(1) }}</span>
            <input v-model.number="aiStore.state.temperature" class="input" type="range" min="0" max="1" step="0.1" />
          </label>
          <label class="field">
            <span>{{ rituals.ai.maxTokens }}</span>
            <input v-model.number="aiStore.state.maxTokens" class="input" type="number" min="256" max="8192" step="64" />
            <span class="field-hint">{{ rituals.ai.maxTokensHint }}</span>
          </label>
        </details>

        <div class="row acts">
          <button type="button" class="btn ghost" :disabled="testing" @click="testConnection">
            {{ testing ? rituals.ai.testing : rituals.ai.test }}
          </button>
          <button type="button" class="btn ghost" @click="clearAi">{{ rituals.ai.clear }}</button>
        </div>

        <p v-if="aiStore.state.lastTest" class="ai-test" :class="{ ok: aiStore.state.lastTest.ok }">
          <template v-if="aiStore.state.lastTest.ok">
            {{ rituals.ai.testOk.replace('{model}', aiStore.state.lastTest.model ?? '').replace('{ms}', String(aiStore.state.lastTest.ms ?? 0)) }}
          </template>
          <template v-else>
            {{ rituals.ai.testFail.replace('{message}', aiStore.state.lastTest.message ?? '') }}
          </template>
        </p>

        <p class="group-note">{{ rituals.ai.keyNote }}</p>
        <p class="group-note">{{ rituals.ai.sendNote }}</p>
      </div>
    </section>

    <!-- 数据 -->
    <section class="group">
      <h2>数据</h2>
      <p class="group-note">你的全部数据（历史、每日一抽、任务、设置）都只存在这台设备上，不上传任何服务器。</p>
      <p class="cap-line">
        占卜记录 {{ historyStore.count }}/200
        <span v-if="historyStore.count >= 200" class="cap-full">已满——新的会挤掉最旧的一条，建议先导出备份</span>
      </p>
      <label v-if="aiStore.state.enabled" class="row check">
        <input v-model="includeAiInBackup" type="checkbox" />
        <span class="row-sub">{{ rituals.ai.backupInclude }}</span>
      </label>
      <div class="row acts">
        <button type="button" class="btn ghost" @click="pickImport">导入记录</button>
        <button type="button" class="btn solid" @click="exportAll">{{ rituals.settings.export }}</button>
      </div>
      <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="onImportFile" />
      <div class="row acts">
        <button type="button" class="btn log" @click="exportLog">导出诊断日志</button>
        <button type="button" class="btn log" @click="showLog = !showLog">
          {{ showLog ? '收起日志' : rituals.ai.logView }}
        </button>
      </div>
      <div v-if="showLog" class="log-box">
        <pre>{{ logText || rituals.ai.logEmpty }}</pre>
        <button type="button" class="btn ghost" @click="copyLog">{{ rituals.ai.logCopy }}</button>
      </div>
    </section>

    <!-- 关于 -->
    <section class="group">
      <h2>关于随机性</h2>
      <p class="about">{{ rituals.settings.aboutRandom }}</p>
    </section>

    <footer class="foot">
      <p>本内容为传统文化体验与自我探索工具，仅供娱乐参考。</p>
      <p>重大决策请咨询专业人士。Tarot Card · 草稿版 M3</p>
    </footer>
  </div>
</template>

<style scoped>
.settings {
  padding-top: calc(0.14rem + var(--safe-top));
  padding-bottom: calc(0.3rem + var(--safe-bottom));
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.14rem;
}
h1 {
  font-size: 0.2rem;
}
.act {
  font-size: 0.12rem;
  color: var(--gold);
}

.group {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel);
  padding: 0.16rem 0.16rem 0.18rem;
  margin-bottom: 0.14rem;
}
h2 {
  font-size: 0.13rem;
  margin-bottom: 0.12rem;
}
.group-note {
  font-size: 0.1rem;
  color: var(--text-3);
  line-height: 1.7;
  margin-bottom: 0.12rem;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.14rem;
  padding: 0.08rem 0;
}
.row + .row {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.row-title {
  font-size: 0.13rem;
  color: var(--text-1);
}
.row-sub {
  font-size: 0.1rem;
  color: var(--text-3);
  margin-top: 0.02rem;
  line-height: 1.6;
}

/* AI 配置（11 §8.1） */
.ai-offline {
  font-size: 0.1rem;
  color: var(--text-3);
  margin-top: 0.06rem;
}
.ai-form {
  margin-top: 0.1rem;
}
.field {
  display: block;
  margin-bottom: 0.1rem;
}
.field > span {
  display: block;
  font-size: 0.1rem;
  color: var(--text-3);
  margin-bottom: 0.04rem;
}
.input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.08rem 0.1rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #14101f;
  color: var(--text-1);
  font-size: 0.12rem;
}
.input:focus {
  outline: none;
  border-color: var(--gold);
}
.key-row {
  display: flex;
  gap: 0.06rem;
  align-items: center;
}
.btn.tiny {
  padding: 0.06rem 0.1rem;
  font-size: 0.1rem;
  flex-shrink: 0;
}
.field-hint {
  display: block;
  font-size: 0.09rem;
  color: var(--text-3);
  margin-top: 0.03rem;
  line-height: 1.6;
}
.adv {
  margin: 0.04rem 0 0.12rem;
}
.log-box {
  margin-top: 0.1rem;
}
.log-box pre {
  max-height: 2.4rem;
  overflow: auto;
  background: #14101f;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.08rem;
  font-size: 0.09rem;
  line-height: 1.6;
  color: var(--text-2);
  white-space: pre-wrap;
  word-break: break-all;
}
.adv > summary {
  font-size: 0.1rem;
  color: var(--gold);
  cursor: pointer;
  margin-bottom: 0.08rem;
}
.ai-test {
  font-size: 0.1rem;
  line-height: 1.6;
  color: #e0a0a0;
  margin: 0.06rem 0;
}
.ai-test.ok {
  color: var(--gold-bright);
}
.row.check {
  justify-content: flex-start;
  gap: 0.08rem;
  align-items: flex-start;
}

.switch {
  width: 0.46rem;
  height: 0.26rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #14101f;
  position: relative;
  flex-shrink: 0;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.switch.on {
  background: linear-gradient(160deg, var(--gold-bright), var(--gold));
  border-color: var(--gold);
}
.switch:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.knob {
  position: absolute;
  top: 50%;
  left: 0.02rem;
  width: 0.2rem;
  height: 0.2rem;
  border-radius: 50%;
  background: var(--text-2);
  transform: translateY(-50%);
  transition: transform 0.2s ease, background 0.2s ease;
}
.switch.on .knob {
  transform: translate(0.2rem, -50%);
  background: #14101f;
}

.row.acts {
  gap: 0.1rem;
}
.btn {
  flex: 1;
  font-size: 0.13rem;
  border-radius: 999px;
  padding: 0.1rem 0;
}
.btn.ghost {
  color: var(--text-2);
  border: 1px solid var(--line);
}
.btn.solid {
  color: #14101f;
  background: linear-gradient(160deg, var(--gold-bright), var(--gold));
}

.about {
  font-size: 0.11rem;
  color: var(--text-2);
  line-height: 2;
}

.foot {
  margin-top: 0.2rem;
  text-align: center;
  color: var(--text-3);
  font-size: 0.09rem;
  line-height: 1.7;
}
</style>
