import { useState, useEffect, useRef } from "react";
import { Platform, Vibration, Animated } from "react-native";
import LottieView from "lottie-react-native";
import * as Haptics from "expo-haptics";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { useRouter } from "expo-router";
import { techniques, type BreathingTechnique } from "@/constants/techniques";
import { loadSettings, addSession } from "@/constants/storage";

// Sounds are keyed by phase duration in seconds. Only specific durations have
// audio files; a phase whose duration has no entry simply plays no sound.
const inhaleSounds: Record<number, number> = {
  4: require("@/assets/sounds/breathe-in-4.mp3"),
};

const exhaleSounds: Record<number, number> = {
  4: require("@/assets/sounds/breathe-out-4.mp3"),
  6: require("@/assets/sounds/breathe-out-6.mp3"),
  8: require("@/assets/sounds/breathe-out-8.mp3"),
};

// Frame metadata from the Lottie JSON (ip/op = first/last frame, fr = fps).
// The animation is only ~2s long natively, so each phase plays its segment at
// a scaled speed to span the phase exactly (see lottieSpeed below).
const lottieAnimation = require("@/assets/animations/breathing.json");
const FIRST_FRAME: number = lottieAnimation.ip;
const LAST_FRAME: number = lottieAnimation.op;
const LOTTIE_NATIVE_SECONDS = (LAST_FRAME - FIRST_FRAME) / lottieAnimation.fr;

// The stateful engine behind the breathing screen: it loads the user's
// settings, drives the phase-by-phase loop (Lottie segment + sound + haptics +
// per-phase countdown), animates the overall progress bar, and persists the
// session on completion. `app/breathing.tsx` is the thin view over this hook.
export function useBreathingSession() {
  const router = useRouter();
  const lottieRef = useRef<LottieView>(null);
  const playersRef = useRef<Record<string, AudioPlayer> | null>(null);
  const parkTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const progress = useRef(new Animated.Value(0)).current;

  // remember where the breath cycle was so Continue resumes instead of restarting
  const phaseIndexRef = useRef(0);
  const phaseRemainingRef = useRef(0); // seconds left in the current phase (0 = start phase fresh)

  // states
  const [breathingTechnique, setBreathingTechnique] = useState<BreathingTechnique>("Resonant");
  const [sessionDuration, setSessionDuration] = useState(5);
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [currentPhase, setCurrentPhase] = useState("Inhale");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [lottieSpeed, setLottieSpeed] = useState(1);
  const [lottieSegment, setLottieSegment] = useState<{ from: number; to: number } | null>(null);

  // Create one player per sound file up front. expo-audio loads sources
  // asynchronously after createAudioPlayer(), so a player created at phase
  // start begins playing late and drifts out of sync with the animation —
  // preloaded players start instantly. Players hold native resources and are
  // not garbage-collected, so remove them on unmount.
  useEffect(() => {
    const players: Record<string, AudioPlayer> = {};
    Object.entries(inhaleSounds).forEach(([duration, file]) => {
      players[`inhale-${duration}`] = createAudioPlayer(file);
    });
    Object.entries(exhaleSounds).forEach(([duration, file]) => {
      players[`exhale-${duration}`] = createAudioPlayer(file);
    });
    playersRef.current = players;

    return () => {
      parkTimersRef.current.forEach(clearTimeout);
      parkTimersRef.current.clear();
      Object.values(players).forEach((player) => player.remove());
      playersRef.current = null;
    };
  }, []);

  const stopSound = () => {
    // pause every player, not just the last-started clip, so an overlapping
    // tail from the previous phase can't survive a pause
    Object.values(playersRef.current ?? {}).forEach((player) => {
      player.pause();
      player.seekTo(0); // rewind now so the next play() starts instantly
    });
  };

  // sound player. The previous phase's clip is deliberately not stopped here:
  // clips are duration-matched to their phases, so they end on their own, and
  // cutting any leftover tail is an audible click.
  const playSound = (type: "inhale" | "exhale", duration: number) => {
    if (!isSoundEnabled) return; // don't play if sound is disabled

    const player = playersRef.current?.[`${type}-${duration}`];

    if (!player) return; // no matching sound file

    player.play(); // preloaded and parked at 0 — starts immediately

    // Park the clip back at 0 just after it ends, timed by our own clock, so
    // the next play() starts instantly (seeking at play time is audibly
    // late). Don't park via the native didJustFinish event: on Android that
    // flag is derived from "state == ended", so it stays true while a
    // finished clip sits at its end and a pause-on-finish handler would kill
    // the next play() (https://github.com/expo/expo/issues/34301).
    const parkTimer = setTimeout(() => {
      parkTimersRef.current.delete(parkTimer);
      if (!playersRef.current) return; // screen unmounted, player removed
      player.pause();
      player.seekTo(0);
    }, duration * 1000 + 250);
    parkTimersRef.current.add(parkTimer);
  };

  const handlePause = () => {
    setIsRunning(!isRunning); // toggle state

    // isRunning is the pre-toggle value, so it's true when we're pausing —
    // that's exactly when the current clip needs to be stopped.
    if (isRunning) {
      stopSound();
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

  // load saved settings
  useEffect(() => {
    loadSettings().then((settings) => {
      setBreathingTechnique(settings.technique);
      setSessionDuration(settings.duration);
      setIsVibrationEnabled(settings.isVibrationEnabled);
      setIsSoundEnabled(settings.isSoundEnabled);
    });
  }, []);

  const selectedPattern = techniques[breathingTechnique] || techniques.Resonant;

  // breathing logic
  useEffect(() => {
    if (!isRunning) {
      progress.stopAnimation(); // stop animation when paused
      return;
    }

    const totalSessionTime = sessionDuration * 60;
    let elapsedTimeLocal = elapsedTime; // maintain paused time

    const pattern = [
      { phase: "Inhale", duration: selectedPattern.pattern.inhale, animationRange: [FIRST_FRAME, LAST_FRAME] },
      { phase: "Hold in", duration: selectedPattern.pattern.hold || 0, animationRange: [LAST_FRAME, LAST_FRAME] },
      { phase: "Exhale", duration: selectedPattern.pattern.exhale, animationRange: [LAST_FRAME, FIRST_FRAME] },
      { phase: "Hold out", duration: selectedPattern.pattern.hold2 || 0, animationRange: [FIRST_FRAME, FIRST_FRAME] },
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
        setLottieSpeed(LOTTIE_NATIVE_SECONDS / duration);
        const [fromFrame, toFrame] = animationRange;
        const elapsedFraction = (duration - remaining) / duration;
        setLottieSegment({
          from: fromFrame + (toFrame - fromFrame) * elapsedFraction,
          to: toFrame,
        });

        if (!resuming) {
          if (phase === "Inhale") {
            playSound("inhale", duration);
          } else if (phase === "Exhale") {
            playSound("exhale", duration);
          }

          if (isVibrationEnabled && phase !== "Hold in" && phase !== "Hold out") {
            if (Platform.OS === "android") {
              Vibration.vibrate([500, 600, 500], false);
            } else if (Platform.OS === "ios") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
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
      Vibration.cancel();
      progress.stopAnimation();
    };
  }, [breathingTechnique, isVibrationEnabled, isRunning, isSoundEnabled]);

  useEffect(() => {
    if (sessionCompleted) {
      const saveSession = async () => {
        await addSession({
          technique: breathingTechnique,
          duration: sessionDuration,
          date: new Date().toISOString(),
        });

        router.push("/summary");
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
    progress,
    breathingTechnique,
    sessionDuration,
    currentPhase,
    secondsLeft,
    isRunning,
    elapsedTime,
    sessionActive,
    handlePause,
  };
}
