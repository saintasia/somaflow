// Single source of truth for all on-device persistence. There is no backend —
// every setting and session-history value lives in AsyncStorage as a string.
// Screens go through the helpers here rather than touching AsyncStorage
// directly, so the key names and value formats (e.g. the "10min" duration
// suffix, JSON-encoded booleans) are defined in exactly one place.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { techniques, type BreathingTechnique } from "@/constants/techniques";

export const STORAGE_KEYS = {
  technique: "breathingTechnique",
  duration: "sessionDuration",
  soundEnabled: "isSoundEnabled",
  vibrationEnabled: "isVibrationEnabled",
  voice: "voiceGuidance",
  history: "breathingHistory",
  totalSessions: "totalSessions",
} as const;

// Voice guidance spoken over the music during a session ("off" keeps music only).
export type VoiceOption = "female" | "male" | "off";
export const VOICE_OPTIONS: VoiceOption[] = ["female", "male", "off"];

// One completed breathing session, as stored in `breathingHistory`.
export type Session = {
  technique: BreathingTechnique;
  duration: number; // minutes
  date: string; // ISO 8601
};

export type Settings = {
  technique: BreathingTechnique;
  duration: number; // minutes
  isSoundEnabled: boolean;
  isVibrationEnabled: boolean;
  voice: VoiceOption;
};

const DEFAULT_SETTINGS: Settings = {
  technique: "Resonant",
  duration: 5,
  isSoundEnabled: true,
  isVibrationEnabled: true,
  voice: "female",
};

// Keep only the 30 most recent sessions to bound on-device storage.
const HISTORY_LIMIT = 30;

// `sessionDuration` is stored with a "min" suffix (e.g. "10min") but consumed
// as a number everywhere. These two helpers own that parse/format symmetry.
const parseDuration = (value: string | null, fallback: number): number => {
  if (!value) return fallback;
  const parsed = parseInt(value.replace("min", ""), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const formatDuration = (minutes: number): string => `${minutes}min`;

// Load all persisted settings at once, applying defaults for anything
// not yet stored. Used by the breathing screen and mirrored on the home tab.
export const loadSettings = async (): Promise<Settings> => {
  const [technique, duration, sound, vibration, voice] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.technique),
    AsyncStorage.getItem(STORAGE_KEYS.duration),
    AsyncStorage.getItem(STORAGE_KEYS.soundEnabled),
    AsyncStorage.getItem(STORAGE_KEYS.vibrationEnabled),
    AsyncStorage.getItem(STORAGE_KEYS.voice),
  ]);

  return {
    technique: (technique as BreathingTechnique) || DEFAULT_SETTINGS.technique,
    duration: parseDuration(duration, DEFAULT_SETTINGS.duration),
    isSoundEnabled: sound ? JSON.parse(sound) : DEFAULT_SETTINGS.isSoundEnabled,
    isVibrationEnabled: vibration
      ? JSON.parse(vibration)
      : DEFAULT_SETTINGS.isVibrationEnabled,
    voice: VOICE_OPTIONS.includes(voice as VoiceOption)
      ? (voice as VoiceOption)
      : DEFAULT_SETTINGS.voice,
  };
};

// Persist a single setting. Booleans are JSON-encoded; strings are stored
// as-is (durations should already carry the "min" suffix — see formatDuration).
export const saveSetting = async (
  key: (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS],
  value: string | boolean
): Promise<void> => {
  await AsyncStorage.setItem(
    key,
    typeof value === "boolean" ? JSON.stringify(value) : value
  );
};

// Record a completed session: prepend it to the capped history and bump the
// lifetime counter. Returns nothing — read back via loadStats().
export const addSession = async (session: Session): Promise<void> => {
  const historyJson = await AsyncStorage.getItem(STORAGE_KEYS.history);
  const history: Session[] = historyJson ? JSON.parse(historyJson) : [];

  const updated = [session, ...history.slice(0, HISTORY_LIMIT - 1)];
  await AsyncStorage.setItem(STORAGE_KEYS.history, JSON.stringify(updated));

  const totalJson = await AsyncStorage.getItem(STORAGE_KEYS.totalSessions);
  const newTotal = totalJson ? parseInt(totalJson, 10) + 1 : 1;
  await AsyncStorage.setItem(STORAGE_KEYS.totalSessions, newTotal.toString());
};

// Read the session history and lifetime counter, used by Progress and Summary.
export const loadStats = async (): Promise<{
  history: Session[];
  totalSessions: number;
}> => {
  const [historyJson, totalJson] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.history),
    AsyncStorage.getItem(STORAGE_KEYS.totalSessions),
  ]);

  return {
    history: historyJson ? JSON.parse(historyJson) : [],
    totalSessions: totalJson ? parseInt(totalJson, 10) : 0,
  };
};

// The technique and duration choices offered in Settings. Techniques derive
// from constants/techniques.ts so adding one is a single-file change.
export const TECHNIQUE_OPTIONS = Object.keys(techniques) as BreathingTechnique[];
export const DURATION_OPTIONS = [2, 5, 10, 15, 20];
