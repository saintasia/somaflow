import { useState, useEffect, useRef, useCallback } from "react";
import { Animated, Platform, Vibration } from "react-native";
import { useFocusEffect } from "expo-router/react-navigation";
import LottieView from "lottie-react-native";
import * as Haptics from "expo-haptics";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { Asset } from "expo-asset";
import { useRouter } from "expo-router";
import {
  techniques,
  describeTechnique,
  type BreathingTechnique,
  type TechniqueDef,
} from "@/constants/techniques";
import {
  visualizations,
  type Visualization,
} from "@/constants/visualizations";
import {
  loadSettings,
  loadCustomTechniques,
  addSession,
  type VoiceOption,
} from "@/constants/storage";

// Music swells are keyed by phase duration in seconds. Only specific durations
// have audio files; a phase whose duration has no entry simply plays no music.
const inhaleMusic: Record<number, number> = {
  4: require("@/assets/sounds/music-breathe-in-4.mp3"),
};

const exhaleMusic: Record<number, number> = {
  4: require("@/assets/sounds/music-breathe-out-4.mp3"),
  6: require("@/assets/sounds/music-breathe-out-6.mp3"),
  8: require("@/assets/sounds/music-breathe-out-8.mp3"),
};

// Spoken guidance cues per phase, for each selectable voice. Both hold
// phases share the one "hold" clip.
const voiceSounds: Record<
  Exclude<VoiceOption, "off">,
  Record<"in" | "out" | "hold", number>
> = {
  female: {
    in: require("@/assets/sounds/voice-breathe-in-female.mp3"),
    out: require("@/assets/sounds/voice-breathe-out-female.mp3"),
    hold: require("@/assets/sounds/voice-hold-female.mp3"),
  },
  male: {
    in: require("@/assets/sounds/voice-breathe-in-male.mp3"),
    out: require("@/assets/sounds/voice-breathe-out-male.mp3"),
    hold: require("@/assets/sounds/voice-hold-male.mp3"),
  },
};

// Music plays under the voice cue at this volume so the voice stays clearly
// audible; when no voice is selected the music plays at full volume.
const DUCKED_MUSIC_VOLUME = 0.6;

// Haptic cues marking each phase change: breathe phases vibrate longer than
// holds. On Android this is one steady RN Vibration one-shot — expo-haptics
// there drives the vibrator at amplitude 30/255, below what the motor
// physically responds to, so its impacts aren't felt at all. iOS has no
// duration control over the Taptic engine, so a ripple of Light impacts
// approximates the same lengths.
const HAPTIC_STYLE = Haptics.ImpactFeedbackStyle.Light;
const HAPTIC_PULSE_GAP_MS = 170; // start-to-start spacing of the iOS pulses
const BREATHE_HAPTIC_PULSES = 5; // iOS: ~0.7s ripple on breathe in / out
const HOLD_HAPTIC_PULSES = 2; // iOS: ~0.2s ripple on the holds
const BREATHE_VIBRATION_MS = 800; // Android: steady buzz on breathe in / out
const HOLD_VIBRATION_MS = 300; // Android: shorter buzz on the holds
// Android 13+ silently reroutes attribute-less vibrations totalling <= 1000ms
// into the "Touch feedback" settings bucket (VibratorManagerService
// .fixupVibrationAttributes promotes USAGE_UNKNOWN to USAGE_TOUCH for
// haptic-feedback candidates), and phones with Touch feedback off drop them
// without error. A trailing WAIT segment — which adds no felt vibration —
// pushes every pattern past 1000ms so it stays in the media bucket
// ("Media vibration" setting) and actually plays.
const HAPTIC_BUCKET_PAD_MS = 1200;

// All of the app's audio players, created lazily once and kept for the app's
// lifetime. Every player holds a native instance from a limited Android pool
// that is not garbage-collected — creating and removing them per screen visit
// both delayed the first phase's clips and, under quick remounts, exhausted
// the pool so play() failed silently until the app was killed. A fixed
// app-wide set sidesteps the whole class.
//
// Two hard-won constraints on top of that:
//
// 1. The assets are downloaded (Asset.loadAsync) BEFORE the players are
//    created. createAudioPlayer resolves a require()'d mp3 to
//    `asset.localUri ?? asset.uri` without downloading — in Expo Go / dev
//    that's a Metro dev-server HTTP URL, so every player streamed its clip
//    from the laptop at load time, and a flaky phone<->laptop connection left
//    all players stuck unloaded forever, with no error surfaced to JS
//    (expo-audio's Android listener has no onPlayerError). Downloading first
//    hands every player a local file URI. In release builds the assets are
//    already on-device and this resolves immediately.
//
// 2. The cache lives on globalThis, NOT in a module-level variable: Metro
//    fast refresh re-evaluates this module, and a module-level cache would be
//    recreated — leaking the previous native players per refresh until
//    Android's pool ran dry (only killing the app recovers). globalThis
//    survives fast refresh, so re-evaluations reuse the same players.
//    (Dev caveat: after editing the sound maps themselves, fully reload the
//    app so the cache is rebuilt with the new entries.)
//
// The cache holds the creation PROMISE (not the result) so concurrent mounts
// can't double-create; on failure it resets so the next visit retries.
const PLAYERS_CACHE_KEY = "__somaflowAudioPlayers__";
const getPlayers = (): Promise<Record<string, AudioPlayer>> => {
  const cache = globalThis as unknown as Record<
    string,
    Promise<Record<string, AudioPlayer>> | undefined
  >;
  const existing = cache[PLAYERS_CACHE_KEY];
  if (existing) return existing;

  const creating = (async () => {
    const allAudioModules = [
      ...Object.values(inhaleMusic),
      ...Object.values(exhaleMusic),
      ...Object.values(voiceSounds).flatMap((clips) => Object.values(clips)),
    ];
    await Asset.loadAsync(allAudioModules);

    const players: Record<string, AudioPlayer> = {};
    Object.entries(inhaleMusic).forEach(([duration, file]) => {
      players[`music-in-${duration}`] = createAudioPlayer(file);
    });
    Object.entries(exhaleMusic).forEach(([duration, file]) => {
      players[`music-out-${duration}`] = createAudioPlayer(file);
    });
    Object.entries(voiceSounds).forEach(([voiceName, clips]) => {
      Object.entries(clips).forEach(([phaseKey, file]) => {
        players[`voice-${voiceName}-${phaseKey}`] = createAudioPlayer(file);
      });
    });

    return players;
  })();

  cache[PLAYERS_CACHE_KEY] = creating;
  creating.catch(() => {
    // failed (likely the asset download) — allow the next visit to retry
    delete cache[PLAYERS_CACHE_KEY];
  });
  return creating;
};

// Warm the audio pipeline at app start (called from the root layout): the
// asset download + player creation take a beat on a cold start, and a Start
// pressed before they finish plays its first phase with no sound (phase
// sounds silently skip when the players aren't ready). Preloading makes them
// ready long before anyone can reach the Start button.
export const preloadBreathingAudio = (): void => {
  getPlayers().catch(() => {
    // ignored here — the breathing screen retries and warns when it actually
    // needs the players
  });
};

// The stateful engine behind the breathing screen: it loads the user's
// settings, drives the phase-by-phase loop (Lottie segment + sound + haptics +
// per-phase countdown), animates the overall progress bar, and persists the
// session on completion. `app/breathing.tsx` is the thin view over this hook.
export function useBreathingSession() {
  const router = useRouter();
  const lottieRef = useRef<LottieView>(null);
  const playersRef = useRef<Record<string, AudioPlayer> | null>(null);
  const parkTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const hapticTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const progress = useRef(new Animated.Value(0)).current;

  // remember where the breath cycle was so Continue resumes instead of restarting
  const phaseIndexRef = useRef(0);
  const phaseRemainingRef = useRef(0); // seconds left in the current phase (0 = start phase fresh)

  // states
  const [breathingTechnique, setBreathingTechnique] =
    useState<BreathingTechnique>("Resonant");
  // the user's own techniques, merged over the built-ins when resolving
  const [customTechniques, setCustomTechniques] = useState<
    Record<string, TechniqueDef>
  >({});
  const [sessionDuration, setSessionDuration] = useState(5);
  const [visualization, setVisualization] = useState<Visualization>("circle");
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [voice, setVoice] = useState<VoiceOption>("female");
  const [currentPhase, setCurrentPhase] = useState("Breathe in");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [lottieSpeed, setLottieSpeed] = useState(1);
  const [lottieSegment, setLottieSegment] = useState<{
    from: number;
    to: number;
  } | null>(null);

  // The players are a lazy module-level singleton: created on the first
  // breathing-screen visit and kept for the app's lifetime (see getPlayers).
  // The screen just borrows them: on unmount it silences and rewinds them,
  // but never removes them, so a re-entered screen starts from fully-loaded
  // players instead of racing their async load (late first phase) or
  // Android's native player release (silent sessions after quick remounts).
  useEffect(() => {
    let mounted = true;
    const parkTimers = parkTimersRef.current;

    getPlayers()
      .then((players) => {
        if (!mounted) return; // left before the assets arrived; cache keeps them for next visit
        playersRef.current = players;
      })
      .catch((error) => {
        // playersRef stays null — phases simply skip their sounds; the cache
        // reset in getPlayers means the next visit retries the download
        console.warn("[breathing] audio unavailable, assets failed to load:", error);
      });

    return () => {
      mounted = false;
      parkTimers.forEach(clearTimeout);
      parkTimers.clear();
      Object.values(playersRef.current ?? {}).forEach((player) => {
        player.pause();
        player.seekTo(0);
      });
      playersRef.current = null; // guards the park timers
    };
  }, []);

  // clips frozen mid-play by the last pause, waiting for Continue
  const pausedMidClipRef = useRef<AudioPlayer[]>([]);

  const stopSound = () => {
    // Full stop (leaving the screen): pause every player, not just the
    // last-started clip, so an overlapping tail can't survive, and rewind so
    // the next play() starts instantly.
    pausedMidClipRef.current = [];
    Object.values(playersRef.current ?? {}).forEach((player) => {
      player.pause();
      player.seekTo(0);
    });
  };

  // Pause (the in-session button): freeze playing clips where they are so
  // Continue picks the audio back up instead of leaving the rest of the
  // phase silent. Clips that already finished are parked at 0 as usual —
  // their park timers are cleared here (they'd fire mid-pause and rewind the
  // frozen clips too), and the resumed clips are re-parked on Continue.
  const pauseSound = () => {
    parkTimersRef.current.forEach(clearTimeout);
    parkTimersRef.current.clear();

    const paused: AudioPlayer[] = [];
    Object.values(playersRef.current ?? {}).forEach((player) => {
      if (player.playing) {
        player.pause(); // keeps its position for Continue
        paused.push(player);
      } else {
        player.pause();
        player.seekTo(0); // park any finished tail so its next play() is clean
      }
    });
    pausedMidClipRef.current = paused;
  };

  const resumeSound = () => {
    const paused = pausedMidClipRef.current;
    pausedMidClipRef.current = [];
    paused.forEach((player) => {
      player.play();
      // re-park for the rest of the phase (the cleared pause-time timer)
      parkAfterPhase(player, phaseRemainingRef.current);
    });
  };

  // Park a clip back at 0 just after its phase ends, timed by our own clock,
  // so the next play() starts instantly (seeking at play time is audibly
  // late). Don't park via the native didJustFinish event: on Android that
  // flag is derived from "state == ended", so it stays true while a finished
  // clip sits at its end and a pause-on-finish handler would kill the next
  // play() (https://github.com/expo/expo/issues/34301).
  const parkAfterPhase = (player: AudioPlayer, duration: number) => {
    const parkTimer = setTimeout(
      () => {
        parkTimersRef.current.delete(parkTimer);
        if (!playersRef.current) return; // screen unmounted, player removed
        player.pause();
        player.seekTo(0);
      },
      duration * 1000 + 250,
    );
    parkTimersRef.current.add(parkTimer);
  };

  // Start the current phase's audio. The two layers are gated independently —
  // the music swell (inhale/exhale only, keyed by duration) by the
  // "Background sound" toggle, the spoken cue by the voice setting — so
  // turning one off never silences the other. When both play, the music is
  // ducked under the voice. The previous phase's clips are deliberately
  // not stopped here: they're timed to end with their phase, and cutting any
  // leftover tail is an audible click.
  const playPhaseSounds = (phase: string, duration: number) => {
    const phaseKey =
      phase === "Breathe in" ? "in" : phase === "Breathe out" ? "out" : "hold";

    const voicePlayer =
      voice === "off"
        ? null
        : playersRef.current?.[`voice-${voice}-${phaseKey}`];
    const musicPlayer =
      !isSoundEnabled || phaseKey === "hold"
        ? null
        : playersRef.current?.[`music-${phaseKey}-${duration}`];

    if (musicPlayer) {
      musicPlayer.volume = voicePlayer ? DUCKED_MUSIC_VOLUME : 1;
      musicPlayer.play(); // preloaded and parked at 0 — starts immediately
      parkAfterPhase(musicPlayer, duration);
    }

    if (voicePlayer) {
      voicePlayer.play();
      parkAfterPhase(voicePlayer, duration);
    }
  };

  // The haptic cue for a phase change: one steady buzz on Android, a ripple
  // of light impacts on iOS. stopHaptics() cuts either short if the session
  // pauses or unmounts mid-cue.
  const playPhaseHaptics = (phase: string) => {
    const isBreathe = phase === "Breathe in" || phase === "Breathe out";

    if (Platform.OS === "android") {
      const ms = isBreathe ? BREATHE_VIBRATION_MS : HOLD_VIBRATION_MS;
      // one steady buzz + the silent bucket pad (see HAPTIC_BUCKET_PAD_MS)
      Vibration.vibrate([0, ms, HAPTIC_BUCKET_PAD_MS]);
      return;
    }

    const pulses = isBreathe ? BREATHE_HAPTIC_PULSES : HOLD_HAPTIC_PULSES;
    Haptics.impactAsync(HAPTIC_STYLE);
    for (let i = 1; i < pulses; i++) {
      const timer = setTimeout(() => {
        hapticTimersRef.current.delete(timer);
        Haptics.impactAsync(HAPTIC_STYLE);
      }, i * HAPTIC_PULSE_GAP_MS);
      hapticTimersRef.current.add(timer);
    }
  };

  const stopHaptics = () => {
    hapticTimersRef.current.forEach(clearTimeout);
    hapticTimersRef.current.clear();
    Vibration.cancel(); // stop an in-progress Android buzz (no-op elsewhere)
  };

  // (Re)resolve the saved settings and the user's custom techniques — the
  // selected technique may be built-in or user-created. Runs at mount and on
  // every focus: the technique editor opens over this screen, so returning
  // from it must pick up an edit, rename, or deletion made there.
  const refreshSettings = useCallback(() => {
    Promise.all([loadSettings(), loadCustomTechniques()]).then(
      ([settings, customs]) => {
        setCustomTechniques(customs);
        setBreathingTechnique(settings.technique);
        setSessionDuration(settings.duration);
        setVisualization(settings.visualization);
        setIsVibrationEnabled(settings.isVibrationEnabled);
        setIsSoundEnabled(settings.isSoundEnabled);
        setVoice(settings.voice);
      },
    );
  }, []);

  // Safety net: if the screen loses focus while still mounted (a navigation
  // path that covers it instead of popping it — e.g. the technique editor),
  // halt the session so its loop, audio, and haptics can't keep running
  // behind another screen; refresh the settings when focus returns.
  useFocusEffect(
    useCallback(() => {
      refreshSettings();
      return () => {
        setIsRunning(false);
        stopSound();
        stopHaptics();
      };
    }, [refreshSettings]),
  );

  const handlePause = () => {
    setIsRunning(!isRunning); // toggle state

    // isRunning is the pre-toggle value: true means we're pausing — freeze
    // the current clips in place; false means we're starting/continuing —
    // resume whatever the last pause froze (a no-op on a fresh start).
    if (isRunning) {
      pauseSound();
    } else {
      resumeSound();
    }
  };

  // (Re)start the circle for the current segment. This runs as an effect so
  // the command reaches the native view after the updated speed prop commits:
  // Android implements a descending range (exhale) by flipping the sign of
  // the view's current speed, so if play() ran first, the subsequent positive
  // speed-prop update would undo the reversal and the circle would stall at
  // the last frame.
  useEffect(() => {
    if (lottieSegment) {
      lottieRef.current?.play(lottieSegment.from, lottieSegment.to);
    }
  }, [lottieSegment]);

  // initial load — the focus effect above also refreshes, but tests mock
  // useFocusEffect to a no-op, so the mount load stays explicit
  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const selectedPattern =
    customTechniques[breathingTechnique] ||
    techniques[breathingTechnique] ||
    techniques.Resonant;
  // The selected Lottie animation plus its frame metadata (first/last frame,
  // native seconds), used to scale each phase's playback speed.
  const selectedVisualization =
    visualizations[visualization] || visualizations.circle;

  // breathing logic
  useEffect(() => {
    if (!isRunning) {
      progress.stopAnimation(); // stop animation when paused
      return;
    }

    const totalSessionTime = sessionDuration * 60;
    let elapsedTimeLocal = elapsedTime; // maintain paused time

    const { firstFrame, lastFrame } = selectedVisualization;
    const pattern = [
      {
        phase: "Breathe in",
        duration: selectedPattern.pattern.inhale,
        animationRange: [firstFrame, lastFrame],
      },
      {
        phase: "Hold in",
        duration: selectedPattern.pattern.hold || 0,
        animationRange: [lastFrame, lastFrame],
      },
      {
        phase: "Breathe out",
        duration: selectedPattern.pattern.exhale,
        animationRange: [lastFrame, firstFrame],
      },
      {
        phase: "Hold out",
        duration: selectedPattern.pattern.hold2 || 0,
        animationRange: [firstFrame, firstFrame],
      },
    ].filter((step) => step.duration > 0);

    // resume from the saved phase (guard against an out-of-range index)
    let i = phaseIndexRef.current % pattern.length;

    let cycleActive = true;

    // Progress bar animation
    Animated.timing(progress, {
      toValue: 1,
      duration: (totalSessionTime - elapsedTimeLocal) * 1000, // adjust for pause
      useNativeDriver: false,
    }).start(() => {
      if (elapsedTimeLocal >= totalSessionTime) {
        setSessionCompleted(true); // mark session as completed if time lapsed
      }
    });

    const runBreathingCycle = async () => {
      while (cycleActive && elapsedTimeLocal < totalSessionTime) {
        if (!isRunning) return; // pause loop when session is paused

        const { phase, duration, animationRange } = pattern[i];

        // resume the current phase mid-way, or start it fresh
        const resuming = phaseRemainingRef.current > 0;
        let remaining = resuming ? phaseRemainingRef.current : duration;

        setCurrentPhase(phase);
        setSecondsLeft(remaining);

        // Play this phase's segment scaled to span the whole phase, so the
        // circle reaches its extreme exactly when the countdown (and sound)
        // end. On resume, start from the proportional frame so the motion
        // picks up where it left off. The sound and vibration only fire when
        // the phase first begins, so resuming doesn't restart the audio.
        // (The actual play() call happens in an effect — see below.)
        setLottieSpeed(selectedVisualization.nativeSeconds / duration);
        const [fromFrame, toFrame] = animationRange;
        const elapsedFraction = (duration - remaining) / duration;
        setLottieSegment({
          from: fromFrame + (toFrame - fromFrame) * elapsedFraction,
          to: toFrame,
        });

        if (!resuming) {
          playPhaseSounds(phase, duration);

          if (isVibrationEnabled) {
            playPhaseHaptics(phase);
          }
        }

        // count down one second at a time so the user sees a per-phase timer
        while (remaining > 0) {
          setSecondsLeft(remaining);
          phaseRemainingRef.current = remaining; // persist so Continue resumes here
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (!cycleActive) return; // bail immediately if paused/unmounted

          remaining -= 1;
          elapsedTimeLocal += 1;
          setElapsedTime(elapsedTimeLocal);
          phaseRemainingRef.current = remaining;

          if (elapsedTimeLocal >= totalSessionTime) {
            setSessionCompleted(true);
            return;
          }
        }

        i = (i + 1) % pattern.length;
        phaseIndexRef.current = i; // advance only after the phase fully elapses
      }
    };

    runBreathingCycle();

    return () => {
      cycleActive = false;
      lottieRef.current?.pause(); // freeze the circle in place instead of resetting it
      stopHaptics();
      progress.stopAnimation();
    };
  }, [
    breathingTechnique,
    visualization,
    isVibrationEnabled,
    isRunning,
    isSoundEnabled,
    voice,
  ]);

  useEffect(() => {
    if (sessionCompleted) {
      const saveSession = async () => {
        await addSession({
          technique: breathingTechnique,
          duration: sessionDuration,
          date: new Date().toISOString(),
        });

        // replace, not push, so the finished breathing screen unmounts and
        // releases its audio players instead of lingering under the summary
        router.replace("/summary");
      };

      saveSession();
    }
  }, [sessionCompleted]);

  // a session is "active" once a phase has begun, including while paused, so the
  // phase label and countdown stay frozen on screen instead of disappearing.
  // (secondsLeft is set the moment a phase starts and holds its value on pause.)
  const sessionActive = isRunning || secondsLeft > 0;

  return {
    lottieRef,
    lottieSpeed,
    // the selected visualization's animation, rendered by the screen's LottieView
    visualizationSource: selectedVisualization.source,
    progress,
    breathingTechnique,
    // resolved via the merged (custom + built-in) lookup — screens must not
    // index `techniques` by name themselves, custom names aren't in it
    techniqueDescription: describeTechnique(selectedPattern),
    // user-created techniques can be deleted right from the session screen
    isCustomTechnique: breathingTechnique in customTechniques,
    sessionDuration,
    currentPhase,
    secondsLeft,
    isRunning,
    elapsedTime,
    sessionActive,
    handlePause,
  };
}
