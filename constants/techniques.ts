// The built-in breathing techniques. User-created techniques live in
// AsyncStorage (constants/storage.ts: loadCustomTechniques and friends) and
// are merged with these at lookup sites — resolve a name as
// `customs[name] ?? techniques[name]` and fall back to Resonant if a
// technique must exist (e.g. to run a session).
export type BreathingPattern = {
  inhale: number;
  // optional short "top-up" inhale straight after the first (the
  // physiological sigh's double inhale); omitted or 0 = single inhale
  inhale2?: number;
  hold: number;
  exhale: number;
  hold2: number;
};

export type TechniqueDef = {
  description: string;
  pattern: BreathingPattern;
};

export const techniques: Record<string, TechniqueDef> = {
  "Resonant": {
    description: "A slow, steady rhythm to settle your autonomic nervous system",
    pattern:{ inhale: 4, hold: 0, exhale: 6, hold2: 0 },
  },
  "4-7-8": {
    description: "Helps reduce stress, improve sleep, and calm the nerves",
    pattern:{ inhale: 4, hold: 7, exhale: 8, hold2: 0 },
  },
  "Box Breathing": {
    description: "Helps reduce stress, enhance focus, and promote calmness",
    pattern:{ inhale: 4, hold: 4, exhale: 4, hold2: 4 },
  },
  // The study's own name for the practice (built on the "physiological
  // sigh" reflex). Balban et al. 2023 prescribes no seconds — participants
  // paced themselves. 4-2-7 is this app's pacing, honoring the study's
  // constraints: top-up shorter than the first inhale, exhale longer than
  // both inhales combined.
  "Cyclic Sighing": {
    description: "Two inhales and a long sigh out, for fast stress relief",
    pattern:{ inhale: 4, inhale2: 2, hold: 0, exhale: 7, hold2: 0 },
  },
}

// Any technique name — one of the built-ins above or a user-created one.
export type BreathingTechnique = string;

// What screens show under a technique name: its description, or — for a
// custom technique saved without one — its pace, e.g. "4s in · 7s hold · 8s out".
export const describeTechnique = ({ description, pattern }: TechniqueDef): string =>
  description ||
  [
    `${pattern.inhale}s in`,
    pattern.inhale2 ? `${pattern.inhale2}s in again` : null,
    pattern.hold ? `${pattern.hold}s hold` : null,
    `${pattern.exhale}s out`,
    pattern.hold2 ? `${pattern.hold2}s hold` : null,
  ]
    .filter(Boolean)
    .join(" · ");
