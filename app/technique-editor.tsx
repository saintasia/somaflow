import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GradientBackground } from "@/components/GradientBackground";
import { RoundIconButton } from "@/components/RoundIconButton";
import { MutedText, scaleFont } from "@/constants/Theme";
import {
  techniques,
  describeTechnique,
  type BreathingPattern,
} from "@/constants/techniques";
import {
  STORAGE_KEYS,
  loadCustomTechniques,
  saveCustomTechnique,
  deleteCustomTechnique,
  saveSetting,
} from "@/constants/storage";

const MAX_PHASE_SECONDS = 20;

// Breathing in and out are what make it a breathing technique — they can't be
// zero. The holds can (the session loop skips zero-duration phases).
const PHASES: { key: keyof BreathingPattern; label: string; min: number }[] = [
  { key: "inhale", label: "Breathe in", min: 1 },
  { key: "hold", label: "Hold in", min: 0 },
  { key: "exhale", label: "Breathe out", min: 1 },
  { key: "hold2", label: "Hold out", min: 0 },
];

// Create or edit a custom breathing technique (modal, opened from the Breathe
// tab's technique carousel — its trailing page creates, the pencil under a
// custom technique edits). Saving also selects the technique, so the tab
// comes back showing what was just made.
export default function TechniqueEditorScreen() {
  const { colors, dark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ name?: string }>();
  const editingName = typeof params.name === "string" ? params.name : undefined;

  const placeholderColor = MutedText[dark ? "dark" : "light"];

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pattern, setPattern] = useState<BreathingPattern>({
    inhale: 4,
    hold: 4,
    exhale: 4,
    hold2: 0,
  });
  const [existingNames, setExistingNames] = useState<string[]>(
    Object.keys(techniques),
  );
  // a save/delete may still be writing when the screen closes — don't fire twice
  const submittingRef = useRef(false);

  useEffect(() => {
    loadCustomTechniques().then((customs) => {
      setExistingNames([...Object.keys(techniques), ...Object.keys(customs)]);
      const editing = editingName ? customs[editingName] : undefined;
      if (editing) {
        setName(editingName as string);
        setDescription(editing.description);
        setPattern(editing.pattern);
      }
    });
  }, [editingName]);

  const trimmedName = name.trim();
  const nameTaken =
    existingNames.includes(trimmedName) && trimmedName !== editingName;
  const canSave = trimmedName.length > 0 && !nameTaken;

  const adjustPhase = (key: keyof BreathingPattern, delta: number) => {
    const min = PHASES.find((phase) => phase.key === key)?.min ?? 0;
    setPattern((current) => ({
      ...current,
      [key]: Math.min(
        MAX_PHASE_SECONDS,
        Math.max(min, current[key] + delta),
      ),
    }));
  };

  const handleSave = async () => {
    if (!canSave || submittingRef.current) return;
    submittingRef.current = true;
    await saveCustomTechnique(
      trimmedName,
      { description: description.trim(), pattern },
      editingName,
    );
    // select what was just made — the Breathe tab reloads on focus
    await saveSetting(STORAGE_KEYS.technique, trimmedName);
    router.back();
  };

  const handleDelete = () => {
    if (!editingName) return;
    Alert.alert(`Delete "${editingName}"?`, "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (submittingRef.current) return;
          submittingRef.current = true;
          // navigate (not back): this editor can be opened over a running
          // session, and the deleted technique shouldn't resume behind us —
          // popping home also unmounts that breathing screen (see the
          // navigation invariant in app/_layout.tsx)
          deleteCustomTechnique(editingName).then(() => router.navigate("/"));
        },
      },
    ]);
  };

  return (
    <GradientBackground>
      <ThemedView
        type="scrollable"
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* the header is transparent (just the floating close chip), so the
            content starts below where it floats */}
        <ThemedView
          style={[styles.container, { paddingTop: insets.top + 64 }]}
        >
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name (e.g. Evening wind-down)"
            placeholderTextColor={placeholderColor}
            maxLength={24}
            accessibilityLabel="Technique name"
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: nameTaken ? colors.notification : colors.border,
                color: colors.text,
              },
            ]}
          />
          {nameTaken && (
            <ThemedText
              style={[styles.nameTakenNote, { color: colors.notification }]}
            >
              A technique with this name already exists
            </ThemedText>
          )}
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What is it for? (optional)"
            placeholderTextColor={placeholderColor}
            maxLength={100}
            multiline
            accessibilityLabel="Technique description"
            style={[
              styles.input,
              styles.inputMultiline,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />

          {/* one ± stepper per phase, same pattern as the tab's minutes row */}
          {PHASES.map(({ key, label, min }) => (
            <View key={key} style={styles.phaseRow}>
              <ThemedText type="defaultSemiBold">{label}</ThemedText>
              <View style={styles.phaseControls}>
                <RoundIconButton
                  icon="minus"
                  accessibilityLabel={`Decrease ${label}`}
                  onPress={() => adjustPhase(key, -1)}
                  disabled={pattern[key] <= min}
                />
                <ThemedText type="subtitle" style={styles.phaseValue}>
                  {pattern[key]}s
                </ThemedText>
                <RoundIconButton
                  icon="plus"
                  accessibilityLabel={`Increase ${label}`}
                  onPress={() => adjustPhase(key, 1)}
                  disabled={pattern[key] >= MAX_PHASE_SECONDS}
                />
              </View>
            </View>
          ))}

          {/* the pace as screens will describe it when no description is set */}
          <ThemedText style={styles.pacePreview}>
            {describeTechnique({ description: "", pattern })}
          </ThemedText>

          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary, opacity: canSave ? 1 : 0.4 },
            ]}
          >
            <ThemedText type="subtitle" style={{ color: "white" }}>
              Save technique
            </ThemedText>
          </Pressable>

          {editingName && (
            <Pressable
              onPress={handleDelete}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${editingName}`}
              style={styles.deleteButton}
            >
              <Feather name="trash-2" size={15} color={colors.notification} />
              <ThemedText
                style={[styles.deleteLabel, { color: colors.notification }]}
              >
                Delete technique
              </ThemedText>
            </Pressable>
          )}
        </ThemedView>
      </ThemedView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  // let the gradient show through behind the ScrollView
  scroll: {
    backgroundColor: "transparent",
  },
  container: {
    padding: 20,
    gap: 12,
    backgroundColor: "transparent",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: scaleFont(16),
    fontFamily: "InclusiveSansRegular",
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  nameTakenNote: {
    fontSize: scaleFont(13),
    marginTop: -6,
  },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  phaseControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  phaseValue: {
    minWidth: 44,
    textAlign: "center",
  },
  pacePreview: {
    textAlign: "center",
    opacity: 0.75,
  },
  saveButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: "center",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 8,
  },
  deleteLabel: {
    fontSize: scaleFont(14),
  },
});
