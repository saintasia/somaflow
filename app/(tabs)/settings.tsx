import { StyleSheet, Pressable } from "react-native";
import { useState, useEffect } from "react";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@react-navigation/native";
import {
  STORAGE_KEYS,
  TECHNIQUE_OPTIONS,
  DURATION_OPTIONS,
  loadSettings,
  saveSetting,
  formatDuration,
} from "@/constants/storage";

export default function SettingsScreen() {
  const { colors } = useTheme();

  // State for settings. Duration is kept as its stored "10min" string here so
  // it can be compared directly against the pill labels.
  const [breathingTechnique, setBreathingTechnique] = useState("Resonant");
  const [sessionDuration, setSessionDuration] = useState("10min");
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true);

  // Load saved preferences on app start
  useEffect(() => {
    loadSettings().then((settings) => {
      setBreathingTechnique(settings.technique);
      setSessionDuration(formatDuration(settings.duration));
      setIsSoundEnabled(settings.isSoundEnabled);
      setIsVibrationEnabled(settings.isVibrationEnabled);
    });
  }, []);

  return (
    <ThemedView type="scrollable">
      <ThemedView style={styles.container}>
        {/* Breathing Technique Selection */}
        <ThemedView style={[styles.optionRow, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">Default technique</ThemedText>
          <ThemedText>Set up your default breathing technique here</ThemedText>
          <ThemedView style={styles.pillContainer}>
            {TECHNIQUE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  setBreathingTechnique(option);
                  saveSetting(STORAGE_KEYS.technique, option);
                }}
                style={[styles.pill, { backgroundColor: breathingTechnique === option ? colors.primary : colors.border }]}
              >
                <ThemedText type="defaultSemiBold" lightColor={breathingTechnique === option ? "white" : colors.text}>
                  {option}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>
        </ThemedView>

        {/* Session Duration Selection */}
        <ThemedView style={[styles.optionRow, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">Default duration</ThemedText>
          <ThemedText>Set up your default session length</ThemedText>
          <ThemedView style={styles.pillContainer}>
            {DURATION_OPTIONS.map((minutes) => {
              const option = formatDuration(minutes);
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    setSessionDuration(option);
                    saveSetting(STORAGE_KEYS.duration, option);
                  }}
                  style={[styles.pill, { backgroundColor: sessionDuration === option ? colors.primary : colors.border }]}
                >
                  <ThemedText type="defaultSemiBold" lightColor={sessionDuration === option ? "white" : colors.text}>
                    {option}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>
        </ThemedView>

        {/* Other Settings */}
        <ThemedView style={{ ...styles.settingRow, backgroundColor: colors.card }}>
          <ThemedText>Sound Guidance</ThemedText>
          <Pressable
            onPress={() => {
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
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
