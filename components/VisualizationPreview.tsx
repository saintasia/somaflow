import { useEffect, useRef } from "react";
import LottieView from "lottie-react-native";
import { visualizations, type Visualization } from "@/constants/visualizations";

// Every preview breathes at the same pace regardless of the animation's
// native length: one sweep out (0 → 1) and back (1 → 0) takes
// 2 × PREVIEW_SWEEP_SECONDS.
const PREVIEW_SWEEP_SECONDS = 3;

// A carousel preview of one visualization. Lottie's built-in loop snaps from
// the last frame back to the first, so instead the segment is replayed by
// hand: forward to the end, then reversed back to the start, mimicking the
// inhale/exhale the animation plays during a session.
export function VisualizationPreview({
  option,
  size,
}: {
  option: Visualization;
  size: number;
}) {
  const lottieRef = useRef<LottieView>(null);
  const forwardRef = useRef(true);
  const { source, firstFrame, lastFrame, nativeSeconds } =
    visualizations[option];

  useEffect(() => {
    forwardRef.current = true;
    lottieRef.current?.play(firstFrame, lastFrame);
  }, [firstFrame, lastFrame]);

  return (
    <LottieView
      ref={lottieRef}
      source={source}
      loop={false}
      speed={nativeSeconds / PREVIEW_SWEEP_SECONDS}
      onAnimationFinish={(isCancelled) => {
        if (isCancelled) return;
        forwardRef.current = !forwardRef.current;
        if (forwardRef.current) {
          lottieRef.current?.play(firstFrame, lastFrame);
        } else {
          lottieRef.current?.play(lastFrame, firstFrame);
        }
      }}
      style={{ width: size, height: size }}
    />
  );
}
