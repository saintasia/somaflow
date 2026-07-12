import { useImperativeHandle, useRef, type Ref } from "react";
import LottieView from "lottie-react-native";
import type { AnimationObject } from "lottie-react-native";
import type { StyleProp, ViewStyle } from "react-native";

// The imperative surface the app drives a breathing animation through.
// `play(from, to)` carries the app's own semantics: from > to is a backward
// sweep (the exhale), from === to freezes on that frame (the holds), and
// speed 0 freezes in place (pause). lottie-react-native's native players
// support all three directly, but its web adapter does not — hence this
// platform-split wrapper (see AppLottieView.web.tsx).
export type AppLottieViewHandle = {
  play: (fromFrame?: number, toFrame?: number) => void;
  pause: () => void;
};

export type AppLottieViewProps = {
  source: AnimationObject;
  loop?: boolean;
  speed?: number;
  style?: StyleProp<ViewStyle>;
  onAnimationFinish?: (isCancelled: boolean) => void;
  ref?: Ref<AppLottieViewHandle>;
};

export default function AppLottieView({ ref, ...props }: AppLottieViewProps) {
  const lottieRef = useRef<LottieView>(null);

  useImperativeHandle(ref, () => ({
    play: (fromFrame?: number, toFrame?: number) =>
      lottieRef.current?.play(fromFrame, toFrame),
    pause: () => lottieRef.current?.pause(),
  }));

  return <LottieView ref={lottieRef} {...props} />;
}
