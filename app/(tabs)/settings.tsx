import { StyleSheet, Pressable } from "react-native";
import { useState, useEffect, useRef } from "react";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GradientBackground } from "@/components/GradientBackground";
import { PillSwitch } from "@/components/PillSwitch";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  STORAGE_KEYS,
  VOICE_OPTIONS,
  DARK_MODE_OPTIONS,
  type VoiceOption,
  loadSettings,
  saveSetting,
} from "@/constants/storage";
import { useThemeMode } from "@/hooks/ThemeModeContext";
import { Pill } from "@/constants/Theme";

// Stored option values are lowercase; capitalize them for the segment labels.
const pillLabel = (option: string) =>
  option.charAt(0).toUpperCase() + option.slice(1);

// The one-of-N control: a full-width row of equal segments with every option
// always visible (for 2–4 short options this beats a dropdown — nothing
// hides behind a tap). The selected segment is filled and carries a check,
// so selection never rests on colour alone. Styled by the scheme-invariant
// Pill palette — the segments look the same in dark mode as in light.
function SegmentedControl<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly T[];
  selected: T;
  onSelect: (option: T) => void;
}) {
  return (
    <ThemedView
      style={styles.segmentRow}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected, selected: isSelected }}
            onPress={() => onSelect(option)}
            style={[
              styles.segment,
              {
                backgroundColor: isSelected
                  ? Pill.activeFill
                  : Pill.inactiveFill,
              },
            ]}
          >
            {isSelected && (
              <Feather name="check" size={14} color={Pill.activeLabel} />
            )}
            <ThemedText
              type="defaultSemiBold"
              style={{
                color: isSelected ? Pill.activeLabel : Pill.inactiveLabel,
              }}
            >
              {pillLabel(option)}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

export default function SettingsScreen() {
  const { colors } = useAppTheme();
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

  // Every card shares one anatomy: title (with the switch, when the setting
  // is binary), a short description, then the control if it isn't in the
  // title row.
  return (
    <GradientBackground>
      <ThemedView type="scrollable" style={styles.scroll}>
        <ThemedView style={styles.container}>
          {/* Voice guidance — one of three */}
          <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle">Voice guidance</ThemedText>
            <ThemedText>
              Spoken cues for each breath, played over the background sound
            </ThemedText>
            <SegmentedControl
              label="Voice guidance"
              options={VOICE_OPTIONS}
              selected={voice}
              onSelect={(option) => {
                interactedRef.current = true;
                setVoice(option);
                saveSetting(STORAGE_KEYS.voice, option);
              }}
            />
          </ThemedView>

          {/* Background sound — on/off */}
          <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
            <ThemedView style={styles.titleRow}>
              <ThemedText type="subtitle">Background sound</ThemedText>
              <PillSwitch
                value={isSoundEnabled}
                onValueChange={(value) => {
                  interactedRef.current = true;
                  setIsSoundEnabled(value);
                  saveSetting(STORAGE_KEYS.soundEnabled, value);
                }}
                accessibilityLabel="Background sound"
                testID="soundToggle"
              />
            </ThemedView>
            <ThemedText>Music swells during each breath</ThemedText>
          </ThemedView>

          {/* Phone vibration — on/off */}
          <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
            <ThemedView style={styles.titleRow}>
              <ThemedText type="subtitle">Phone vibration</ThemedText>
              <PillSwitch
                value={isVibrationEnabled}
                onValueChange={(value) => {
                  interactedRef.current = true;
                  setIsVibrationEnabled(value);
                  saveSetting(STORAGE_KEYS.vibrationEnabled, value);
                }}
                accessibilityLabel="Phone vibration"
                testID="vibrationToggle"
              />
            </ThemedView>
            <ThemedText>Vibration marks each breathing phase</ThemedText>
          </ThemedView>

          {/* Dark mode — one of three */}
          <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle">Dark mode</ThemedText>
            <ThemedText>
              Auto follows your device&apos;s appearance setting
            </ThemedText>
            <SegmentedControl
              label="Dark mode"
              options={DARK_MODE_OPTIONS}
              selected={darkMode}
              onSelect={setDarkMode}
            />
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
  // card padding is 16 app-wide (StatCard, progress/summary cards)
  card: {
    padding: 16,
    gap: 6,
    flexDirection: "column",
    borderRadius: 10,
  },
  // inner rows stay transparent — the translucent card tint would stack
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    backgroundColor: "transparent",
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 40,
  },
});
