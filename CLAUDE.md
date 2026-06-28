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
- `app/breathing.tsx` — the core breathing session screen (not a tab; pushed onto the stack).
- `app/summary.tsx` — post-session summary, reached via `router.push("/summary")` when a session completes.

**Theming.** A single source of truth in `constants/Theme.ts` (`LightTheme`/`DarkTheme`) feeds `constants/Colors.ts`. Light/dark is chosen automatically from the system color scheme (`hooks/useColorScheme.ts`, `.web` variant for web). Always style through the theme, not hardcoded hex:
- Inside components, get colors via `const { colors } = useTheme()` (from `@react-navigation/native`) and reference `colors.primary`, `colors.card`, `colors.border`, etc.
- Use `ThemedView` and `ThemedText` (`components/`) rather than raw `View`/`Text`. `ThemedText` has a `type` prop (`title | subtitle | defaultSemiBold | default | link`) that maps to the `InclusiveSans` font styles; `ThemedView` has `type="scrollable"` to render a `ScrollView`.

**Path alias.** `@/*` maps to the repo root (see `tsconfig.json`), e.g. `@/components/ThemedText`, `@/assets/sounds/...`.

**Breathing techniques** are defined in `constants/techniques.ts` as `{ inhale, hold, exhale, hold2 }` second-durations (Resonant, 4-7-8, Box Breathing). `BreathingTechnique` is the keyed union type used across screens. To add a technique, add an entry here and to the option lists in `settings.tsx` (`["Resonant", "4-7-8", ...]`).

**Breathing session loop** (`app/breathing.tsx`) is the most intricate file:
- An async `while` loop steps through the active phases (zero-duration phases are filtered out), driving the Lottie animation segment, optional sound, and haptics/vibration per phase. A separate `Animated.timing` drives the progress bar over the full session.
- Pause/resume is handled by toggling `isRunning`; the effect cleanup (`cycleActive = false`, reset Lottie, cancel vibration) tears the loop down. `elapsedTime` is preserved across pauses so timing resumes correctly.
- On completion it sets `sessionCompleted`, which triggers a separate effect that persists the session and navigates to the summary.

**Sounds** are keyed by phase duration in seconds (`inhaleSounds`/`exhaleSounds` maps in `breathing.tsx`). Only specific durations have audio files (`assets/sounds/breathe-{in,out}-{4,6,8}.mp3`); a phase with no matching file simply plays no sound. Adding audio for a new duration means adding the mp3 and a map entry.

## Persistence (AsyncStorage)

All data is stored as AsyncStorage key/value strings — there is no schema layer, so keys and value formats must stay consistent across screens that read/write them:

| Key | Format | Written by | Read by |
|-----|--------|-----------|---------|
| `breathingTechnique` | string, e.g. `"4-7-8"` | settings | breathing, index, settings |
| `sessionDuration` | string with `min` suffix, e.g. `"10min"` | settings | breathing, index, settings (parsed via `parseInt(v.replace("min",""))`) |
| `isSoundEnabled` | JSON bool (`"true"`/`"false"`) | settings | breathing, settings |
| `isVibrationEnabled` | JSON bool | settings | breathing, settings |
| `breathingHistory` | JSON array of `{ technique, duration, date(ISO) }`, capped at 30 most recent | breathing | progress, summary |
| `totalSessions` | stringified int counter | breathing | progress, summary |

Note `sessionDuration` is stored with the `min` suffix but consumed as a number — keep the parse/format symmetry when touching it.

## Testing

Tests use `jest-expo` + `@testing-library/react-native`. Screen tests live in `app/__tests__/*.test.tsx`; component tests in `components/__tests__/*-test.tsx` (note both `.test.tsx` and `-test.tsx` naming conventions exist). Tests mock AsyncStorage and assert on rendered text/toggles, so when changing storage keys or visible copy, update the corresponding test.
