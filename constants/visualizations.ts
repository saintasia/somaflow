// The session visualizations: Lottie animations the breathing screen can play
// (and the Breathe tab previews in its carousel). Adding one is a one-file
// change — add an entry here and both screens pick it up: the
// carousel derives its pages from VISUALIZATION_OPTIONS and the session hook
// reads the selected entry's source and frame metadata.
//
// Every animation is authored as one inhale sweep (~2s natively); the session
// hook plays it forward for "Breathe in", backward for "Breathe out", and
// frozen at either end for the holds, scaled to span the phase exactly.
import type { AnimationObject } from "lottie-react-native";

type VisualizationDef = {
  label: string;
  source: AnimationObject;
  // Frame metadata from the Lottie JSON (ip/op = first/last frame, fr = fps),
  // derived once here so the session hook can scale playback speed per phase.
  firstFrame: number;
  lastFrame: number;
  nativeSeconds: number;
};

const defineVisualization = (
  label: string,
  source: AnimationObject,
): VisualizationDef => ({
  label,
  source,
  firstFrame: source.ip,
  lastFrame: source.op,
  nativeSeconds: (source.op - source.ip) / source.fr,
});

export const visualizations = {
  circle: defineVisualization(
    "Circle",
    require("@/assets/animations/circle.json"),
  ),
  mandala: defineVisualization(
    "Mandala",
    require("@/assets/animations/mandala.json"),
  ),
  shape: defineVisualization(
    "Shape",
    require("@/assets/animations/shape.json"),
  ),
  star: defineVisualization("Star", require("@/assets/animations/star.json")),
  lotus: defineVisualization(
    "Lotus",
    require("@/assets/animations/lotus.json"),
  ),
};

export type Visualization = keyof typeof visualizations;

export const VISUALIZATION_OPTIONS = Object.keys(
  visualizations,
) as Visualization[];
