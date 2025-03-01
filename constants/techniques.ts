export const techniques = {
  "Resonant": {
    description: "Improve Long COVID, CFS and Dysautonomia symptoms by enhancing autonomic function",
    pattern:{ inhale: 4, hold: 0, exhale: 6, hold2: 0 },
  },
  "4-7-8": {
    description: "Helps reduce stress, improve sleep, and calm the nervous system",
    pattern:{ inhale: 4, hold: 7, exhale: 8, hold2: 0 },
  },
  "Box Breathing": {
    description: "Helps reduce stress, enhance focus, and promote calmness",
    pattern:{ inhale: 4, hold: 4, exhale: 4, hold2: 4 },
  },
}

export type BreathingTechnique = keyof typeof techniques;
