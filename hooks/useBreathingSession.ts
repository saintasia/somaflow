import { useState, useEffect, useRef } from "react";
import { Animated } from "react-native";
import LottieView from "lottie-react-native";
import * as Haptics from "expo-haptics";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { useRouter } from "expo-router";
import { techniques, type BreathingTechnique } from "@/constants/techniques";
import {
  loadSettings,
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

// Haptic cues. expo-haptics is used on both platforms — unlike RN's Vibration
// API (full-strength buzz only on Android), its Android implementation drives
// the vibrator at low amplitude (a Light impact is ~50ms at amplitude 30/255),
// so the cues stay gentle. A phase's perceived length comes from rippling
// several light pulses: breathe phases ripple longer than holds.
const HAPTIC_STYLE = Haptics.ImpactFeedbackStyle.Light;
const HAPTIC_PULSE_GAP_MS = 170;
const BREATHE_HAPTIC_PULSES = 5; // ~0.7s ripple on breathe in / breathe out
const HOLD_HAPTIC_PULSES = 2; // ~0.2s ripple on the holds

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
  const hapticTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const progress = useRef(new Animated.Value(0)).current;

  // remember where the breath cycle was so Continue resumes instead of restarting
  const phaseIndexRef = useRef(0);
  const phaseRemainingRef = useRef(0); // seconds left in the current phase (0 = start phase fresh)

  // states
  const [breathingTechnique, setBreathingTechnique] =
    useState<BreathingTechnique>("Resonant");
  const [sessionDuration, setSessionDuration] = useState(5);
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

  // Create one player per sound file up front. expo-audio loads sources
  // asynchronously after createAudioPlayer(), so a player created at phase
  // start begins playing late and drifts out of sync with the animation —
  // preloaded players start instantly. Players hold native resources and are
  // not garbage-collected, so remove them on unmount.
  useEffect(() => {
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

  // Start the current phase's audio: the music swell (inhale/exhale only,
  // keyed by duration) plus the spoken cue when a voice is selected, with the
  // music ducked underneath it. The previous phase's clips are deliberately
  // not stopped here: they're timed to end with their phase, and cutting any
  // leftover tail is an audible click.
  const playPhaseSounds = (phase: string, duration: number) => {
    if (!isSoundEnabled) return; // don't play if sound is disabled

    const phaseKey =
      phase === "Breathe in" ? "in" : phase === "Breathe out" ? "out" : "hold";

    const voicePlayer =
      voice === "off"
        ? null
        : playersRef.current?.[`voice-${voice}-${phaseKey}`];
    const musicPlayer =
      phaseKey === "hold"
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

  // A gentle ripple of light taps marking the phase change. The first pulse
  // fires immediately; the rest are scheduled and cancelled by stopHaptics()
  // if the session pauses or unmounts mid-ripple.
  const playPhaseHaptics = (phase: string) => {
    const pulses =
      phase === "Breathe in" || phase === "Breathe out"
        ? BREATHE_HAPTIC_PULSES
        : HOLD_HAPTIC_PULSES;

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
      setVoice(settings.voice);
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
      {
        phase: "Breathe in",
        duration: selectedPattern.pattern.inhale,
        animationRange: [FIRST_FRAME, LAST_FRAME],
      },
      {
        phase: "Hold in",
        duration: selectedPattern.pattern.hold || 0,
        animationRange: [LAST_FRAME, LAST_FRAME],
      },
      {
        phase: "Breathe out",
        duration: selectedPattern.pattern.exhale,
        animationRange: [LAST_FRAME, FIRST_FRAME],
      },
      {
        phase: "Hold out",
        duration: selectedPattern.pattern.hold2 || 0,
        animationRange: [FIRST_FRAME, FIRST_FRAME],
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
        setLottieSpeed(LOTTIE_NATIVE_SECONDS / duration);
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
