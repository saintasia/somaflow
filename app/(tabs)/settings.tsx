import { StyleSheet, Pressable } from "react-native";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@react-navigation/native";

export default function SettingsScreen() {
  const { colors } = useTheme();

  // State for settings
  const [breathingTechnique, setBreathingTechnique] = useState("Resonant");
  const [sessionDuration, setSessionDuration] = useState("10min");
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true);

  // Load saved preferences on app start
  useEffect(() => {
    const loadSettings = async () => {
      const savedTechnique = await AsyncStorage.getItem("breathingTechnique");
      const savedDuration = await AsyncStorage.getItem("sessionDuration");
      const savedSound = await AsyncStorage.getItem("isSoundEnabled");
      const savedVibration = await AsyncStorage.getItem("isVibrationEnabled");

      if (savedTechnique) setBreathingTechnique(savedTechnique);
      if (savedDuration) setSessionDuration(savedDuration);
      if (savedSound) setIsSoundEnabled(JSON.parse(savedSound));
      if (savedVibration) setIsVibrationEnabled(JSON.parse(savedVibration));
    };
    loadSettings();
  }, []);

  // Save preferences when changed
  const saveSetting = async (key: string, value: any) => {
    await AsyncStorage.setItem(key, typeof value === "boolean" ? JSON.stringify(value) : value);
  };

  return (
    <ThemedView type="scrollable">
      <ThemedView style={styles.container}>
        {/* Breathing Technique Selection */}
        <ThemedView style={[styles.optionRow, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">Default technique</ThemedText>
          <ThemedText>Set up your default breathing technique here</ThemedText>
          <ThemedView style={styles.pillContainer}>
            {["Resonant", "4-7-8", "Box Breathing"].map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  setBreathingTechnique(option);
                  saveSetting("breathingTechnique", option);
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
            {["2min", "5min", "10min", "15min", "20min"].map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  setSessionDuration(option);
                  saveSetting("sessionDuration", option);
                }}
                style={[styles.pill, { backgroundColor: sessionDuration === option ? colors.primary : colors.border }]}
              >
                <ThemedText type="defaultSemiBold" lightColor={sessionDuration === option ? "white" : colors.text}>
                  {option}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>
        </ThemedView>

        {/* Other Settings */}
        <ThemedView style={{ ...styles.settingRow, backgroundColor: colors.card }}>
          <ThemedText>Sound Guidance</ThemedText>
          <Pressable
            onPress={() => {
              setIsSoundEnabled(!isSoundEnabled);
              saveSetting("isSoundEnabled", !isSoundEnabled);
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
              saveSetting("isVibrationEnabled", !isVibrationEnabled);
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
