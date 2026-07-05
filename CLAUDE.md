# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SomaFlow is a React Native (Expo) guided-breathing app. It runs on iOS, Android, and web from a single codebase. There is no backend — all state (settings + session history) lives on-device in AsyncStorage.

## Commands

The app targets **Expo SDK 54** (React 19, React Native 0.81). `.npmrc` sets `legacy-peer-deps=true` because RN 0.81's React 19 peer ranges otherwise make `npm install` / `expo install` fail to resolve — keep it.

```bash
npm install            # install dependencies (uses legacy-peer-deps via .npmrc)
npm run start          # start Expo dev server (then press i / a / w)
npm run ios            # start on iOS simulator
npm run android        # start on Android emulator
npm run web            # start on web
npm run test           # jest in --watchAll mode (interactive)
npm run test:all       # jest with coverage (single run)
npm run lint           # expo lint
```

Run a single test file or test:

```bash
npx jest app/__tests__/breathing.test.tsx
npx jest -t "saves session on completion"
```

`npm run reset-project` moves the starter scaffolding into `app-example/` — do not run it; this project is already built out.

## Architecture

**Routing (expo-router, file-based).** Routes are defined by files under `app/`:
- `app/_layout.tsx` — root `Stack`. Loads the `InclusiveSans` fonts, applies the navigation theme, and registers the `(tabs)`, `breathing`, and `summary` screens. The custom `headerLeft` back buttons use `onPressIn` instead of `onPress` to work around an [Expo bug](https://github.com/expo/expo/issues/33093) — this pattern is intentional and repeated for the breathing Start/Pause button too.
- `app/(tabs)/_layout.tsx` — bottom tab bar (`index` (Breathe), `progress`, `settings`), rendered by `components/FloatingTabBar.tsx` (a custom `tabBar`): the tabs float transparently over the gradient — no surface, border, or shadow — and the active tab is marked by a rounded `ActiveTabHighlight` square sitting under its icon + label, which slides between tabs on an `Animated.spring`. Screens extend behind the bar — bottom-anchored or scrolling content pads its bottom edge with `FLOATING_TAB_CLEARANCE` + the safe-area inset (both in `constants/Theme.ts`). The Breathe tab is where a session is configured — visualization (paged Lottie carousel, previewed by `components/VisualizationPreview.tsx` which ping-pongs the animation 0→1→0 at a constant pace), technique (full-width pages holding the name and description, so a drag on either swipes; the `<`/`>` chevrons float over the name row as the accessible alternative; the trailing page — never saved as a selection — creates a technique in the editor, and tapping a user-created page opens it there to edit; built-in pages aren't tappable), session length (a paged minutes carousel, also swipeable, with ± buttons) — each choice saved to storage the moment it changes. The technique/minutes rows and the "Start breathing" button share one fixed-width column (`CONTROL_WIDTH`), buttons pinned to the row edges. Settings holds only the sound/voice/vibration preferences. **Carousel selection must stay driven by `onViewableItemsChanged`, not `onMomentumScrollEnd`**: react-native-web never dispatches momentum events (a swipe would visibly snap but silently never save on web), and TalkBack/VoiceOver-initiated scrolls don't emit them either. The minutes list must also keep `initialScrollIndex` on the current selection — its default (5 min) isn't page 0, and without it the initial viewability callback would "select" 1 min and overwrite the saved length. The `<`/`>` chevrons and the ± buttons share one themed pill, `components/RoundIconButton.tsx` — use it for any new round icon control rather than re-styling a `Pressable`.
- `app/breathing.tsx` — the core breathing session screen (not a tab; pushed onto the stack). This is now a thin view; all session logic lives in `hooks/useBreathingSession.ts` (see below). The Lottie visualization is the focal point (large, centered in a flex area); the technique name and description sit below on an understated card in normal flow — not absolute-positioned, so it can never overlap the Start/Pause button — kept above the OS gesture area by the safe-area bottom inset. When the technique is user-created, that card carries a small round edit chip that pushes the technique editor over this screen — the focus-loss safety net pauses the session, and the hook refreshes settings + customs on refocus, so an edit or rename made in the editor is reflected on return. Deleting from the editor instead `router.navigate("/")`s home, unwinding (and therefore unmounting) the session screen underneath rather than resuming a deleted technique. The screen's header is transparent (no title, no shadow) with a floating × close chip as `headerLeft`; restyle it freely but keep `onPressIn` + `router.back()` (see the navigation invariant below).
- `app/summary.tsx` — post-session summary, reached via `router.replace("/summary")` when a session completes. Headers app-wide are transparent over the gradient (`headerTransparent` + no shadow — a default header paints the translucent `card` color, which reads as a grey band): summary and the technique editor keep a title and a chip-style back chevron; the breathing screen is fully bare (close chip only). Transparent headers mean each screen pads its own top by the safe-area inset + header height.
- **Navigation invariant: leaving the breathing screen must unmount it.** Its back button uses `router.back()` (a real pop) and completion uses `router.replace` — never change these to `push`/`navigate`: a breathing screen left mounted keeps its session loop, audio, and haptics running behind the tabs, and stacked copies once exhausted Android's native audio players (sessions went permanently silent). `useBreathingSession` additionally halts the session on focus loss as a safety net, but don't rely on it instead of popping.

**Theming.** A single source of truth in `constants/Theme.ts` (`LightTheme`/`DarkTheme`) feeds `constants/Colors.ts`. Light/dark is chosen automatically from the system color scheme (`hooks/useColorScheme.ts`, `.web` variant for web). Every screen's root is `components/GradientBackground.tsx` — a soft themed backdrop gradient (`BackgroundGradients` in `Theme.ts`) — so use it instead of a background-colored root `ThemedView` and keep the views inside it transparent: a default `ThemedView` paints a flat background-colored block that stands out against the gradient (this is what "white boxes" on a screen mean). `colors.card` is a translucent dark tint so cards read slightly darker than whichever gradient stop they sit on — never nest card-on-card, the tints stack into darker patches (StatCard's inner views are transparent for exactly this reason). Chrome that floats over content (the breathing screen's close chip) uses the near-opaque `FloatingSurface` instead. Cards use 16px padding app-wide (StatCard, settings rows, progress/summary cards). Always style through the theme, not hardcoded hex:
- Inside components, get colors via `const { colors } = useTheme()` (from `@react-navigation/native`) and reference `colors.primary`, `colors.card`, `colors.border`, etc.
- Use `ThemedView` and `ThemedText` (`components/`) rather than raw `View`/`Text`. `ThemedText` has a `type` prop (`title | subtitle | defaultSemiBold | default | link`) that maps to the `InclusiveSans` font styles; `ThemedView` has `type="scrollable"` to render a `ScrollView`.
- `components/StatCard.tsx` is the shared stat tile (label + description + big number) used by both the Progress and Summary screens. It accepts `children` for extra content below the header row (Progress passes the weekday dots). Use it rather than re-building the card layout.

**Path alias.** `@/*` maps to the repo root (see `tsconfig.json`), e.g. `@/components/ThemedText`, `@/assets/sounds/...`.

**Breathing techniques** come in two kinds. Built-ins live in `constants/techniques.ts` as `{ description, pattern: { inhale, hold, exhale, hold2 } }` (Resonant, 4-7-8, Box Breathing) — adding one is still a **one-file** change. User-created techniques live in AsyncStorage (`customTechniques`, managed by `app/technique-editor.tsx`, a modal opened from the technique carousel). Because of that, `BreathingTechnique` is just `string` and **`techniques[name]` must never be indexed directly with a user-picked name** — resolve `customs[name] ?? techniques[name]` (customs from `loadCustomTechniques()`), fall back to `techniques.Resonant` when a definition is required to run, and render blurbs with `describeTechnique()` (which falls back to the pace, e.g. "4s in · 7s hold · 8s out", when a custom technique has no description). `loadSettings()` validates the stored selection against the merged set, and the storage helpers keep the selection consistent through renames and deletions. Session length is free-form minutes from the tab's stepper, clamped to `MIN_SESSION_MINUTES`/`MAX_SESSION_MINUTES` (`constants/storage.ts`).

**Visualizations** (the Lottie animation a session plays) follow the same pattern in `constants/visualizations.ts`: each entry holds a label, the required animation JSON, and frame metadata (`firstFrame`/`lastFrame`/`nativeSeconds`) derived from it once at module load. Adding one is a **one-file** change — the Breathe tab's carousel derives its pages from `VISUALIZATION_OPTIONS`, and `useBreathingSession` plays the selected entry. Animations must be authored as a single inhale sweep (like `circle.json`, ~2s): the hook plays them forward for "Breathe in", backward for "Breathe out", frozen at either end for the holds, speed-scaled to span each phase exactly.

**Breathing session loop** lives in `hooks/useBreathingSession.ts` — the most intricate code in the app. `app/breathing.tsx` just calls the hook and renders. The hook owns:
- An async `while` loop that steps through the active phases (zero-duration phases are filtered out), driving the Lottie animation segment, optional sound, and haptics/vibration per phase. A separate `Animated.timing` drives the progress bar over the full session.
- Pause/resume by toggling `isRunning`; the effect cleanup (`cycleActive = false`, freeze Lottie, cancel vibration) tears the loop down. `elapsedTime` is preserved across pauses, and `phaseIndexRef`/`phaseRemainingRef` let Continue resume mid-phase rather than restarting the cycle. Pause also freezes the currently playing clips in place (`pauseSound`) and Continue picks them back up (`resumeSound`) — only leaving the screen rewinds everything to 0 (`stopSound`).
- On completion it sets `sessionCompleted`, which triggers a separate effect that persists the session (via `addSession`) and navigates to the summary.

**Sounds** are two layers, both preloaded as `expo-audio` players in `hooks/useBreathingSession.ts` and started together at phase start. The players are a lazy app-lifetime singleton (`getPlayers()`, async): created once on the first breathing-screen visit and never removed — each player holds a native instance from a limited Android pool, so per-visit create/remove churn caused late first clips and, eventually, permanently silent sessions. Two invariants inside `getPlayers()`, both learned from silent-session hunts: the mp3 assets are **downloaded via `Asset.loadAsync` before any player is created** (otherwise dev players stream from the Metro dev server over HTTP and a flaky connection leaves every player stuck `isLoaded=false` forever — expo-audio's Android listener surfaces no error), and the cache lives **on `globalThis`, not a module variable** (Metro fast refresh re-evaluates the module; a module-level cache leaked the previous native players per refresh until the pool ran dry). The screen only borrows the players, silencing and rewinding them on unmount/blur. `app/_layout.tsx` calls `preloadBreathingAudio()` at app start so the download/creation completes before the first Start press — phases silently skip their sounds if the players aren't ready yet, which muted the first phase of a cold start's first session. The two layers: **music** swells keyed by phase duration in seconds (`inhaleMusic`/`exhaleMusic` maps; only specific durations have files — `assets/sounds/music-breathe-{in,out}-{4,6,8}.mp3` — a phase with no matching file plays no music) and **voice guidance** cues per phase (`voiceSounds` map; `assets/sounds/voice-{breathe-in,breathe-out,hold}-{female,male}.mp3`, selected by the `voiceGuidance` setting; both hold phases share the one hold clip). When a voice is active the music is ducked under it (`DUCKED_MUSIC_VOLUME`). **The two layers are gated independently** — music by `isSoundEnabled` (the "Background sound" toggle), voice only by the `voiceGuidance` setting — so disabling one must never silence the other (it used to: a single early return on `isSoundEnabled` killed the voice too, which read as "all audio randomly dead"). Adding music for a new duration means adding the mp3 and a map entry; adding a new voice means adding its three clips, a `voiceSounds` entry, and a `VOICE_OPTIONS` value.

**Haptics** (also in `useBreathingSession.ts`) are platform-split: Android gets one steady `Vibration.vibrate` waveform per phase (`BREATHE_VIBRATION_MS` / `HOLD_VIBRATION_MS`), iOS gets a ripple of expo-haptics Light impacts (the Taptic engine has no duration control). Two Android constraints, both learned the hard way:
- Every Android pattern ends with a silent `HAPTIC_BUCKET_PAD_MS` wait segment that keeps the pattern's **total length over 1000ms — never remove it**. Android 13+ silently reclassifies attribute-less vibrations totalling ≤ 1000ms as "touch feedback", which many phones have off, so the vibration is dropped with no error while everything else (keyboard, ring) still buzzes (unresolved upstream: facebook/react-native#53515). Patterns over 1s stay governed by the phone's "Media vibration" setting, which is on by default.
- Don't use expo-haptics for the Android cues: its impacts are ≤ 60ms at amplitude ≤ 70/255 — too weak for some motors — and, being short effects, they land in the same dropped touch-feedback bucket.

If vibration "doesn't work" on a device even though the code fires, get ground truth with `adb shell dumpsys vibrator_manager`: Android logs every vibration request with its usage bucket and a status (e.g. `ignored_for_settings`), which tells you whether the OS received it and why it was suppressed.

## Persistence (AsyncStorage)

All data is stored as AsyncStorage key/value strings — there is no backend. **`constants/storage.ts` is the single access layer**: screens do not call `AsyncStorage` directly. It owns the key names (`STORAGE_KEYS`), the `Session` type, and helpers that encapsulate the value-format quirks:
- `loadSettings()` → typed `{ technique, duration, visualization, isSoundEnabled, isVibrationEnabled, voice }` with defaults (used by breathing, index, settings).
- `saveSetting(STORAGE_KEYS.x, value)` — booleans are JSON-encoded, strings stored as-is. Format durations with `formatDuration(minutes)` before saving.
- `addSession(session)` — prepends to the 30-item-capped history and bumps `totalSessions` (called on completion by `useBreathingSession`).
- `loadStats()` → `{ history, totalSessions }` (used by progress, summary).

Underlying keys/formats (now owned by `storage.ts`, not written by hand in screens):

| Key | Format |
|-----|--------|
| `breathingTechnique` | string, e.g. `"4-7-8"` |
| `sessionDuration` | string with `min` suffix, e.g. `"10min"`; parsed to a number by `loadSettings`, re-formatted by `formatDuration` |
| `breathingVisualization` | string key into `visualizations`, e.g. `"circle"` (default); unknown values fall back to the default |
| `isSoundEnabled` / `isVibrationEnabled` | JSON bool (`"true"`/`"false"`) |
| `voiceGuidance` | string: `"female"` (default) / `"male"` / `"off"` |
| `breathingHistory` | JSON array of `Session` (`{ technique, duration, date(ISO) }`), capped at 30 most recent |
| `totalSessions` | stringified int counter |
| `customTechniques` | JSON record `{ [name]: { description, pattern } }` — only via `loadCustomTechniques`/`saveCustomTechnique`/`deleteCustomTechnique`, which re-point or reset `breathingTechnique` on rename/delete |

The `"10min"`-suffix parse/format asymmetry is contained inside `storage.ts` — add new persistence there rather than reading/writing keys directly from screens.

## Testing

Tests use `jest-expo` + `@testing-library/react-native`. Screen tests live in `app/__tests__/*.test.tsx`; component tests in `components/__tests__/*-test.tsx` (note both `.test.tsx` and `-test.tsx` naming conventions exist). Tests mock AsyncStorage and assert on rendered text/toggles, so when changing storage keys or visible copy, update the corresponding test.
