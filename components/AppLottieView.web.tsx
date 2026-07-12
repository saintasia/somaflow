import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import type { CSSProperties } from "react";
import type { AppLottieViewProps } from "./AppLottieView";

// Web implementation of the app's Lottie surface, driving dotlottie directly.
// lottie-react-native's own web adapter forwards play(from, to) straight to
// dotlottie's setSegment(from, to), but the dotlottie WASM player requires
// from <= to: a reversed range (every exhale) trips a Rust clamp panic
// ("min > max, or either was NaN") that aborts and permanently destroys the
// player, and an equal-frame call (the holds) falls into a branch that plays
// on to the animation's end instead of freezing. This wrapper re-expresses
// the app's semantics in dotlottie terms: a normalized (ascending) segment
// plus setMode("reverse") for backward sweeps, pause + setFrame for freezes,
// and pause for the speed-0 convention (dotlottie has no zero speed).
const applyPlay = (dotLottie: DotLottie, from?: number, to?: number) => {
  if (from !== undefined && to !== undefined) {
    if (from === to) {
      dotLottie.pause();
      dotLottie.setFrame(from);
      return;
    }
    dotLottie.setMode(from < to ? "forward" : "reverse");
    dotLottie.setSegment(Math.min(from, to), Math.max(from, to));
    dotLottie.setFrame(from);
    dotLottie.play();
    return;
  }
  if (from !== undefined) {
    dotLottie.setFrame(from);
  }
  dotLottie.play();
};

export default function AppLottieView({
  source,
  loop = false,
  speed = 1,
  style,
  onAnimationFinish,
  ref,
}: AppLottieViewProps) {
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);

  // play() can arrive before the async WASM/animation load finishes (the
  // carousel previews play from a mount effect) — park the last request and
  // replay it, at the current speed, once the player reports loaded.
  const pendingPlayRef = useRef<
    [number | undefined, number | undefined] | null
  >(null);

  useImperativeHandle(
    ref,
    () => ({
      play: (fromFrame?: number, toFrame?: number) => {
        if (dotLottie?.isLoaded) {
          applyPlay(dotLottie, fromFrame, toFrame);
        } else {
          pendingPlayRef.current = [fromFrame, toFrame];
        }
      },
      pause: () => dotLottie?.pause(),
    }),
    [dotLottie],
  );

  useEffect(() => {
    if (!dotLottie) return;

    const handleLoad = () => {
      if (speed > 0) dotLottie.setSpeed(speed);
      const pending = pendingPlayRef.current;
      if (pending) {
        pendingPlayRef.current = null;
        applyPlay(dotLottie, pending[0], pending[1]);
      }
    };
    const handleComplete = () => onAnimationFinish?.(false);

    dotLottie.addEventListener("load", handleLoad);
    dotLottie.addEventListener("complete", handleComplete);
    if (dotLottie.isLoaded) handleLoad();

    return () => {
      dotLottie.removeEventListener("load", handleLoad);
      dotLottie.removeEventListener("complete", handleComplete);
    };
  }, [dotLottie, onAnimationFinish, speed]);

  // speed 0 is the app's "freeze in place" (the session's pause) — dotlottie
  // rejects non-positive speeds, so map it to pause instead.
  useEffect(() => {
    if (!dotLottie) return;
    if (speed > 0) {
      dotLottie.setSpeed(speed);
    } else {
      dotLottie.pause();
    }
  }, [dotLottie, speed]);

  return (
    <DotLottieReact
      dotLottieRefCallback={setDotLottie}
      data={source as unknown as Record<string, unknown>}
      loop={loop}
      autoplay={false}
      style={StyleSheet.flatten(style) as CSSProperties | undefined}
    />
  );
}
