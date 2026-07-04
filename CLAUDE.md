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
- `app/(tabs)/_layout.tsx` — bottom tab bar: `index` (Breathe), `progress`, `settings`.
- `app/breathing.tsx` — the core breathing session screen (not a tab; pushed onto the stack). This is now a thin view; all session logic lives in `hooks/useBreathingSession.ts` (see below).
- `app/summary.tsx` — post-session summary, reached via `router.push("/summary")` when a session completes.

**Theming.** A single source of truth in `constants/Theme.ts` (`LightTheme`/`DarkTheme`) feeds `constants/Colors.ts`. Light/dark is chosen automatically from the system color scheme (`hooks/useColorScheme.ts`, `.web` variant for web). Always style through the theme, not hardcoded hex:
- Inside components, get colors via `const { colors } = useTheme()` (from `@react-navigation/native`) and reference `colors.primary`, `colors.card`, `colors.border`, etc.
- Use `ThemedView` and `ThemedText` (`components/`) rather than raw `View`/`Text`. `ThemedText` has a `type` prop (`title | subtitle | defaultSemiBold | default | link`) that maps to the `InclusiveSans` font styles; `ThemedView` has `type="scrollable"` to render a `ScrollView`.
- `components/StatCard.tsx` is the shared stat tile (label + description + big number) used by both the Progress and Summary screens. It accepts `children` for extra content below the header row (Progress passes the weekday dots). Use it rather than re-building the card layout.

**Path alias.** `@/*` maps to the repo root (see `tsconfig.json`), e.g. `@/components/ThemedText`, `@/assets/sounds/...`.

**Breathing techniques** are defined in `constants/techniques.ts` as `{ inhale, hold, exhale, hold2 }` second-durations (Resonant, 4-7-8, Box Breathing). `BreathingTechnique` is the keyed union type used across screens. Adding a technique is a **one-file** change: add an entry here. The Settings screen derives its technique pills from `Object.keys(techniques)` (via `TECHNIQUE_OPTIONS` in `constants/storage.ts`), so there is no separate list to keep in sync. Session-length options live in `DURATION_OPTIONS` (also `constants/storage.ts`).

**Breathing session loop** lives in `hooks/useBreathingSession.ts` — the most intricate code in the app. `app/breathing.tsx` just calls the hook and renders. The hook owns:
- An async `while` loop that steps through the active phases (zero-duration phases are filtered out), driving the Lottie animation segment, optional sound, and haptics/vibration per phase. A separate `Animated.timing` drives the progress bar over the full session.
- Pause/resume by toggling `isRunning`; the effect cleanup (`cycleActive = false`, freeze Lottie, cancel vibration) tears the loop down. `elapsedTime` is preserved across pauses, and `phaseIndexRef`/`phaseRemainingRef` let Continue resume mid-phase rather than restarting the cycle.
- On completion it sets `sessionCompleted`, which triggers a separate effect that persists the session (via `addSession`) and navigates to the summary.

**Sounds** are keyed by phase duration in seconds (`inhaleSounds`/`exhaleSounds` maps in `hooks/useBreathingSession.ts`). Only specific durations have audio files (`assets/sounds/breathe-{in,out}-{4,6,8}.mp3`); a phase with no matching file simply plays no sound. Adding audio for a new duration means adding the mp3 and a map entry.

## Persistence (AsyncStorage)

All data is stored as AsyncStorage key/value strings — there is no backend. **`constants/storage.ts` is the single access layer**: screens do not call `AsyncStorage` directly. It owns the key names (`STORAGE_KEYS`), the `Session` type, and helpers that encapsulate the value-format quirks:
- `loadSettings()` → typed `{ technique, duration, isSoundEnabled, isVibrationEnabled }` with defaults (used by breathing, index, settings).
- `saveSetting(STORAGE_KEYS.x, value)` — booleans are JSON-encoded, strings stored as-is. Format durations with `formatDuration(minutes)` before saving.
- `addSession(session)` — prepends to the 30-item-capped history and bumps `totalSessions` (called on completion by `useBreathingSession`).
- `loadStats()` → `{ history, totalSessions }` (used by progress, summary).

Underlying keys/formats (now owned by `storage.ts`, not written by hand in screens):

| Key | Format |
|-----|--------|
| `breathingTechnique` | string, e.g. `"4-7-8"` |
| `sessionDuration` | string with `min` suffix, e.g. `"10min"`; parsed to a number by `loadSettings`, re-formatted by `formatDuration` |
| `isSoundEnabled` / `isVibrationEnabled` | JSON bool (`"true"`/`"false"`) |
| `breathingHistory` | JSON array of `Session` (`{ technique, duration, date(ISO) }`), capped at 30 most recent |
| `totalSessions` | stringified int counter |

The `"10min"`-suffix parse/format asymmetry is contained inside `storage.ts` — add new persistence there rather than reading/writing keys directly from screens.

## Testing

Tests use `jest-expo` + `@testing-library/react-native`. Screen tests live in `app/__tests__/*.test.tsx`; component tests in `components/__tests__/*-test.tsx` (note both `.test.tsx` and `-test.tsx` naming conventions exist). Tests mock AsyncStorage and assert on rendered text/toggles, so when changing storage keys or visible copy, update the corresponding test.
