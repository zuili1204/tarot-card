# Tarot Card · Tarot Reading

English | [简体中文](README.md)

![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Android-blue.svg)
![Release](https://img.shields.io/badge/release-v1.0%20APK-brightgreen.svg)
![Frontend](https://img.shields.io/badge/Vue-3.4-brightgreen.svg)
![Build](https://img.shields.io/badge/Vite-5-orange.svg)
![Capacitor](https://img.shields.io/badge/Capacitor-8-lightgrey.svg)

A mobile-first (portrait) tarot reading app built on the classic Rider-Waite-Smith deck: from the mood guidance of a "Daily Draw", to in-depth readings with full spreads, to studying the meanings of all 78 cards — turning "asking the cards" into a small, ritualistic daily habit you can look back on.

- **Fully local**: no backend, no accounts, no tracking; data stays on your device. With no AI configured, the app makes zero network requests.
- **One codebase, two targets**: Vue 3 + Vite frontend, wrapped by Capacitor 8 into an Android package, with 100% reuse of the web assets.
- **Substantial content**: a structured Chinese meaning library covering 78 cards × upright/reversed × multiple scenarios, with zero hardcoded copy in the engine.

---

## Download (Prebuilt Package)

A ready-to-install **release build** is included in this repository — just download and install, no development environment required:

| File | Description |
|---|---|
| [`release/塔罗牌.apk`](release/塔罗牌.apk) | Android package, about **7.4 MB**, versionName `1.0` (versionCode 1) |

- **Requirements**: Android 7.0 (API 24) or higher, armeabi-v7a / arm64-v8a
- **Installation**: download the APK on your phone and tap to install. If the system warns about "unknown sources", allow this installation in Settings (the package is self-signed and not published to any app store).
- **First launch**: a 3-screen onboarding (skippable), then the "Daily Draw" home screen.
- **Data**: all reading records are stored locally and are cleared on uninstall. To keep them, export a backup via **Settings → Data Export**.
- **Network**: fully offline by default. The app only goes online if you fill in an AI endpoint yourself in Settings and explicitly request an interpretation (BYOK — requests go straight to the service you configured, never through any server of this project).

> You can also download historical versions from the Releases page; the `release/` directory in this repo is updated along with the code.

---

## Features

### Main Reading Flow (Ask → Spread → Draw → Result)

1. **Ask**: enter a question → automatic scenario routing (11 domains / 64 scenarios + sub-situation matching) → recommended spread
2. **Spread**: 9 spreads — Daily Draw, Yes/No Single Draw, Three-Card (timeline / situation / either-or), Situation Cross, Relationship Spread (7 cards), Horseshoe (7 cards), Celtic Cross (10 cards)
3. **Five-step ritual**: long-press to shuffle (dovetail/riffle, swing amplitude grows as you charge) → cut into three piles → fan out all 78 cards and pick → the drawn card FLIPs into place → reveal cards one by one for interpretation
4. **Interpretation**: single-card section → relational position section (elemental relationship matrix) → four-part synthesis (upright/reversed ratio / Major Arcana ratio / elemental distribution / aggregated advice) → scenario closing line

### Capability List

| Capability | Description |
|---|---|
| Daily Draw | One card per day + keywords + short reading + today's practice, with closed-loop exits: "That's it for today / I want to ask something specific / What card is this" |
| Yes/No Single Draw | Quick yes-or-no judgment; reversal does not change the verdict tier, it only appends a note at the explanation layer |
| Card Dictionary | Browse and search all 78 cards, toggle upright/reversed, per-domain meanings, yes/no tendency |
| History | Timeline review with **non-rewriting snapshots** (revisiting still shows the cards drawn then and the interpretation text of that moment); local 200-record FIFO + export / import |
| Share Image | Native Canvas 2D generation (card face + keywords + quote + QR code + disclaimer in the corner) |
| Mirror Stats | Review of draw frequency, upright/reversed ratio, elemental distribution, and more |
| Learning Center | Three illustrated articles from *Tarot in 10 Minutes* (What are the 78 cards / Reversal is not good or bad / How to ask questions that get good answers) |
| Onboarding | 3-screen first-launch onboarding + first-run guard + three beginner tasks to unlock deep spreads + in-flow micro guidance |
| AI Deep Reading (BYOK) | Users fill in their own API endpoint and key; the app connects directly to **the service the user specifies**. Disabled by default — with it off, the app never goes online |
| Accessibility & Degradation | All animations short-circuit under `prefers-reduced-motion`; low-end devices only animate `transform / opacity` |

---

## Quick Start (Web)

Requirements: Node.js ≥ 18.18, npm ≥ 9.

```bash
git clone https://github.com/<your-name>/tarot-card.git
cd tarot-card/tarot-web

npm install          # install dependencies
npm run dev          # local dev server (default http://localhost:5173)
npm test             # Vitest engine unit tests (12 files / 72 cases)
npm run build        # production build (content gate + vue-tsc type check + vite build)
npm run preview      # preview the build output
```

> Acceptance is based on browser DevTools mobile emulation (390×844). Desktop browsers are guaranteed to be "usable and not broken"; there is no dedicated desktop layout.

---

## Android Build

```bash
cd tarot-web
npm install
npm run cap:sync      # = build:android + npx cap sync android (sync web assets and native plugins)
```

Then pick one of the following:

- **Android Studio**: open `tarot-web/android` and Run / Build APK directly
- **Command line** (Windows PowerShell):

```powershell
$env:JAVA_HOME = "<path to Android Studio bundled JBR>"   # e.g. .../Android Studio/jbr
cd tarot-web\android
.\gradlew.bat assembleDebug      # output: app\build\outputs\apk\debug\app-debug.apk
.\gradlew.bat assembleRelease    # output: app\build\outputs\apk\release\app-release.apk
```

Key configuration: `applicationId = com.tarot.app`, `minSdk 24` / `targetSdk 36`, `androidScheme = https` (keeps the WebView in a secure context so `crypto.getRandomValues` is available).

**Signing**: copy `android/keystore.properties.template` to `keystore.properties` and fill in your own key info to produce a signed package. If not provided, an unsigned package is built and the build does not fail. `*.keystore`, `keystore.properties`, and `local.properties` are all listed in `.gitignore` — **do not commit them**.

---

## Directory Structure

```
tarot-card/
├─ release/                      # Prebuilt packages (shipped with the repo, ready to download)
│  └─ 塔罗牌.apk
├─ tarot-web/                    # Frontend project (shared by Web and Android)
│  ├─ src/
│  │  ├─ views/                  # Home / Ask / Spread / Draw / Result / Library /
│  │  │                          # CardDetail / YesNo / History / Stats / Settings /
│  │  │                          # Onboarding / Learn
│  │  ├─ components/             # Backdrop / CardFace / CardBack / TaskProgress
│  │  ├─ engine/                 # Pure functional domain logic (no DOM access)
│  │  │  ├─ shuffle.ts           # Fisher-Yates shuffle + cut offset + orientation preset
│  │  │  ├─ interpreter.ts       # Static interpretation assembly engine
│  │  │  ├─ match.ts             # Question → domain / scenario / sub-situation routing
│  │  │  ├─ yesno.ts  stats.ts   # Yes/No single draw, Mirror stats
│  │  │  ├─ compliance.ts        # Runtime compliance word-list fallback
│  │  │  ├─ share.ts             # Canvas share image
│  │  │  └─ ai/                  # BYOK client: client / prompt / scan / http
│  │  ├─ stores/                 # Pinia: reading / history / daily / settings / task / ai / toast
│  │  ├─ platform/               # Platform adapters: storage / back / insets / haptics / share / notify / sound …
│  │  ├─ data/                   # cards.json / spreads.json / compliance.json + content/ (generated)
│  │  └─ router/                 # hash-mode routing + first-run guard
│  ├─ public/cards/              # 78 card faces + card back (dev-time assets, see "Assets & License")
│  ├─ scripts/                   # sync-content (content gate) / parse-cards / build-android-icons
│  ├─ android/                   # Capacitor Android project
│  └─ tests/unit/                # Vitest unit tests
├─ .gitignore
├─ LICENSE
└─ README.md
```

---

## Content Pipeline & Content Gate

Copy is **never written inside the code**; it follows a one-way "master → artifact" sync:

```
Content master (internal material, not published with the repo)
        └─(npm run content:sync)─▶  src/data/content/*.json (committed, used directly at runtime)
```

`scripts/sync-content.mjs` also acts as the **content gate** (failing the gate means `exit 1` and `npm run build` fails immediately):

1. Compliance word gate: scans all JSON under `src/data` for forbidden words; any `block`-level hit fails the build (`ai-prompt.json` must list forbidden words to the model, so it is exempt from the word gate and uses structural validation instead)
2. Scenario registry: unique ids, `basedOn ∈ 11 domains`, complete fields
3. Scenario copy: full coverage of the 78 card keys, with warnings for lengths <30 / >120 characters
4. Quotes: full coverage of the 78 keys, warning above 28 characters
5. Position templates: every `position.tpl` in a spread has an intro + 3 variant callbacks
6. Relationship table: 16 relation groups × 4 upright/reversed combinations, all present
7. Synthesis layer: four-part set + scenario closing line + generic opening; the three Learning Center articles are structurally complete

> **The build works even without the content master**: if no master directory is detected, the script enters an "artifacts-only validation" mode, validating directly against the existing `src/data/content/` in the repo, with just one extra informational warning. You only need your own master directory when you want to change copy.

---

## Architecture Notes

- **Layering discipline**: `views` contain no business rules; `engine` never touches the DOM. Engine input and output are plain JSON, fully unit-testable, and reusable as-is when migrating to Android or a backend.
- **Randomness**: at shuffle time the full permutation and orientations are frozen (Fisher-Yates); the entropy source is `crypto.getRandomValues` (OS-level cryptographic entropy). A single injection point, `setRandomSource`, lets tests pin a seed. The reversal toggle applies at the draw output layer, without reshuffling.
- **Non-rewriting snapshots**: interpretation text is snapshotted as soon as it is produced and stored with the record, so later revisions never affect history.
- **Storage adapter**: `platform/storage.ts` — Preferences (small) + Filesystem (large) on native, localStorage on web; `SCHEMA_VERSION` + a migration table, with destructive rebuilds disabled.
- **Animation discipline**: only `transform / opacity` are animated; durations and easing all come from motion tokens, with scattered magic numbers forbidden.
- **Zero animation libraries, zero UI component libraries**: CSS transitions / keyframes + Web Animations API, with hand-written controls.

---

## Roadmap

- **Done**: full web flow (skeleton / main reading flow / history and sharing / onboarding), Android self-use-grade package (icon, splash, safe-area insets, back key, haptics, signing and compression), Yes/No single draw, Learning Center, three-card spread variants, Mirror stats, AI deep reading (BYOK)
- **P1**: PWA, refined sound effects, font subsetting, upgraded sharing aesthetics
- **P2**: desktop widgets, daily reminders, high-resolution card art replacement
- **P3**: backend-ification (accounts / cloud sync / server-side AI proxy)
- **Not planned**: accounts and payments (at this stage), social features and livestreaming, collecting fortune-telling personal data, decks other than Rider-Waite-Smith

---

## Randomness & Compliance

**Randomness**: both shuffle and orientation are generated by `crypto.getRandomValues`; cutting only changes the starting offset for dealing. The Settings → About page contains the full algorithm description.

**Content red lines** (enforced by both the content gate and a runtime fallback — double protection):

1. No medical claims; health issues are redirected to seeing a doctor
2. No investment advice; finances are limited to "financial mindset / planning tendencies"
3. No deterministic predictions; wording is uniformly "tends to / may / suggested to watch"
4. Positioned as entertainment and culture; store categories are "Entertainment" or "Lifestyle"
5. Minor protection: age gate + a permanent disclaimer on the result page and share image
6. AI-generated content is clearly labeled "AI generated, for reference only" with the model name noted

**Privacy**: no accounts, no tracking, no third-party SDKs. AI is BYOK and disabled by default; unconfigured means zero network requests. This project holds no keys and retains no data.

---

## About the Documentation

Product and engineering design docs (product definition, card meaning system, interpretation rules, motion plan, Android plan, etc.) are internal materials and are **not published with this repository**. What the repo keeps is directly runnable project code and content artifacts; the interfaces and data structures are self-explanatory:

- Data structures and field conventions: `tarot-web/src/data/` (cards / spreads / compliance / content)
- Domain logic and validation rules: `tarot-web/src/engine/` and `tarot-web/tests/unit/`
- Content validation rules: `tarot-web/scripts/sync-content.mjs`

---

## Assets & License

- **Code**: MIT, see [LICENSE](LICENSE)
- **Card artwork**: the card images in `tarot-web/public/cards` are third-party assets used during development and are **not confirmed to be freely redistributable**. If you plan to distribute publicly or publish to a store, first replace them with public-domain scans of the original 1909 Rider-Waite-Smith deck and keep the source URL
- **Card back**: original design, free to use with the code
- **Signing keys**: the repo contains no keystore; use your own key to build a signed package

> This app is positioned as an entertainment and cultural experience tool. Reading results do not constitute medical, legal, or investment advice.

---

## Contributing

Issues and PRs are welcome. Before submitting, please make sure:

```bash
npm run content:sync   # content gate: compliance words + coverage + template completeness
npm test               # engine unit tests
npm run build          # type check + build
```

If you change engine logic, add cases under `tests/unit/`. For copy changes, generate them from the content master rather than editing `src/data/content/` directly.

---

## License

[MIT](LICENSE) © 2026 Tarot Card contributors
