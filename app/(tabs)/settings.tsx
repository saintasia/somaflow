import { StyleSheet, Pressable } from "react-native";
import { useState, useEffect, useRef } from "react";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GradientBackground } from "@/components/GradientBackground";
import { useTheme } from "@react-navigation/native";
import {
  STORAGE_KEYS,
  VOICE_OPTIONS,
  DARK_MODE_OPTIONS,
  type VoiceOption,
  loadSettings,
  saveSetting,
} from "@/constants/storage";
import { useThemeMode } from "@/hooks/ThemeModeContext";

// Stored option values are lowercase; capitalize them for the pill labels.
const pillLabel = (option: string) =>
  option.charAt(0).toUpperCase() + option.slice(1);

export default function SettingsScreen() {
  const { colors } = useTheme();
  // Dark mode lives in context (not local state): setting it re-themes every
  // mounted screen immediately, and the provider persists it.
  const { darkMode, setDarkMode } = useThemeMode();

  // State for settings. Technique, session length, and visualization moved to
  // the Breathe tab — this screen owns the sound/voice/vibration preferences.
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true);
  const [voice, setVoice] = useState<VoiceOption>("female");

  // A tap can land before the mount-time load below resolves; without this
  // guard the late resolve overwrites the tapped state, so the toggle shows
  // one value while storage holds the other (sessions then go silent "for no
  // reason"). Any interaction wins over an in-flight load.
  const interactedRef = useRef(false);

  // Load saved preferences on app start
  useEffect(() => {
    loadSettings().then((settings) => {
      if (interactedRef.current) return;
      setIsSoundEnabled(settings.isSoundEnabled);
      setIsVibrationEnabled(settings.isVibrationEnabled);
      setVoice(settings.voice);
    });
  }, []);

  return (
    <GradientBackground>
      <ThemedView type="scrollable" style={styles.scroll}>
      <ThemedView style={styles.container}>
        {/* Voice Guidance Selection */}
        <ThemedView style={[styles.optionRow, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">Voice guidance</ThemedText>
          <ThemedText>Spoken cues for each breath, played over the background sound</ThemedText>
          <ThemedView style={styles.pillContainer}>
            {VOICE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  interactedRef.current = true;
                  setVoice(option);
                  saveSetting(STORAGE_KEYS.voice, option);
                }}
                style={[styles.pill, { backgroundColor: voice === option ? colors.primary : colors.border }]}
              >
                <ThemedText type="defaultSemiBold" lightColor={voice === option ? "white" : colors.text}>
                  {pillLabel(option)}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>
        </ThemedView>

        {/* Other Settings */}
        <ThemedView style={{ ...styles.settingRow, backgroundColor: colors.card }}>
          <ThemedText>Background sound</ThemedText>
          <Pressable
            onPress={() => {
              interactedRef.current = true;
              setIsSoundEnabled(!isSoundEnabled);
              saveSetting(STORAGE_KEYS.soundEnabled, !isSoundEnabled);
            }}
            style={[styles.toggleButton, { backgroundColor: isSoundEnabled ? colors.primary : colors.border }]}
            testID="soundToggle"
          >
            <ThemedText lightColor={isSoundEnabled ? "white" : colors.text}>
              {isSoundEnabled ? "On" : "Off"}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={{ ...styles.settingRow, backgroundColor: colors.card }}>
          <ThemedText>Phone Vibration</ThemedText>
          <Pressable
            onPress={() => {
              interactedRef.current = true;
              setIsVibrationEnabled(!isVibrationEnabled);
              saveSetting(STORAGE_KEYS.vibrationEnabled, !isVibrationEnabled);
            }}
            style={[styles.toggleButton, { backgroundColor: isVibrationEnabled ? colors.primary : colors.border }]}
            testID="vibrationToggle"
          >
            <ThemedText lightColor={isVibrationEnabled ? "white" : colors.text}>
              {isVibrationEnabled ? "On" : "Off"}
            </ThemedText>
          </Pressable>
        </ThemedView>

        {/* Dark Mode Selection */}
        <ThemedView style={[styles.optionRow, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">Dark mode</ThemedText>
          <ThemedText>Auto follows your device&apos;s appearance setting</ThemedText>
          <ThemedView style={styles.pillContainer}>
            {DARK_MODE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => setDarkMode(option)}
                style={[styles.pill, { backgroundColor: darkMode === option ? colors.primary : colors.border }]}
              >
                <ThemedText type="defaultSemiBold" lightColor={darkMode === option ? "white" : colors.text}>
                  {pillLabel(option)}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>
        </ThemedView>
      </ThemedView>
      </ThemedView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  // let the GradientBackground behind the ScrollView show through
  scroll: {
    backgroundColor: "transparent",
  },
  container: {
    padding: 20,
    paddingTop: 30,
    marginTop: 40,
    flexDirection: "column",
    gap: 10,
    backgroundColor: "transparent",
  },
  settingRow: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
  },
  optionRow: {
    padding: 16,
    gap: 6,
    flexDirection: "column",
    borderRadius: 10,
  },
  pillContainer: {
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 40,
    marginVertical: 5,
    marginRight: 5,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
});
