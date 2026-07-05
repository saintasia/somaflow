import {
  StyleSheet,
  Pressable,
  FlatList,
  View,
  type ViewToken,
} from "react-native";
import { useState, useCallback, useRef } from "react";
import { techniques, type BreathingTechnique } from "@/constants/techniques";
import {
  visualizations,
  VISUALIZATION_OPTIONS,
  type Visualization,
} from "@/constants/visualizations";
import {
  STORAGE_KEYS,
  TECHNIQUE_OPTIONS,
  MIN_SESSION_MINUTES,
  MAX_SESSION_MINUTES,
  loadSettings,
  saveSetting,
  formatDuration,
} from "@/constants/storage";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { VisualizationPreview } from "@/components/VisualizationPreview";
import { RoundIconButton } from "@/components/RoundIconButton";
import { useRouter } from "expo-router";
import { useTheme, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

// Both carousels page by a fixed width (the FlatList is exactly one page
// wide), so swipes, the chevrons, and scrollToIndex all agree on offsets.
const VISUALIZATION_PAGE_WIDTH = 320;
const VISUALIZATION_PREVIEW_SIZE = 280;
const TECHNIQUE_PAGE_WIDTH = 200;

// Selection follows the page filling the viewport (fires once a settling page
// crosses the threshold). This must stay viewability-based, NOT
// onMomentumScrollEnd: react-native-web never dispatches momentum events (the
// carousel would visibly snap but never save on web), and screen-reader
// initiated scrolls (TalkBack/VoiceOver) don't emit them either.
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const visualizationListRef = useRef<FlatList<Visualization>>(null);
  const techniqueListRef = useRef<FlatList<BreathingTechnique>>(null);

  // The session choices made here (visualization, technique, length) persist
  // immediately so the breathing screen reads them straight from storage.
  const [visualization, setVisualization] = useState<Visualization>("circle");
  const [breathingTechnique, setBreathingTechnique] =
    useState<BreathingTechnique>("Resonant");
  const [sessionDuration, setSessionDuration] = useState(5);

  const techniqueIndex = TECHNIQUE_OPTIONS.indexOf(breathingTechnique);

  // Set once the user touches any control after focus. A loadSettings read
  // started on focus can resolve late (AsyncStorage on a cold start takes a
  // beat) — without this guard it would overwrite choices made in between.
  const interactedRef = useRef(false);

  // reload the saved choices whenever the tab regains focus and line the
  // carousels up with them
  useFocusEffect(
    useCallback(() => {
      interactedRef.current = false;
      let focused = true;

      loadSettings().then(({ technique, duration, visualization: saved }) => {
        if (!focused || interactedRef.current) return;
        setBreathingTechnique(technique);
        setSessionDuration(duration);
        setVisualization(saved);

        const savedTechniqueIndex = TECHNIQUE_OPTIONS.indexOf(technique);
        if (savedTechniqueIndex >= 0) {
          techniqueListRef.current?.scrollToIndex({
            index: savedTechniqueIndex,
            animated: false,
          });
        }
        const savedVisualizationIndex = VISUALIZATION_OPTIONS.indexOf(saved);
        if (savedVisualizationIndex >= 0) {
          visualizationListRef.current?.scrollToIndex({
            index: savedVisualizationIndex,
            animated: false,
          });
        }
      });

      return () => {
        focused = false;
      };
    }, []),
  );

  const selectVisualization = (option: Visualization) => {
    interactedRef.current = true;
    setVisualization(option);
    saveSetting(STORAGE_KEYS.visualization, option);
  };

  const selectTechnique = (option: BreathingTechnique) => {
    interactedRef.current = true;
    setBreathingTechnique(option);
    saveSetting(STORAGE_KEYS.technique, option);
  };

  // The FlatList forbids swapping onViewableItemsChanged between renders, so
  // both handlers are created once and read the live selection from refs.
  const visualizationRef = useRef(visualization);
  visualizationRef.current = visualization;
  const breathingTechniqueRef = useRef(breathingTechnique);
  breathingTechniqueRef.current = breathingTechnique;

  const handleVisualizationViewable = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<Visualization>[] }) => {
      const option = viewableItems.find((token) => token.isViewable)?.item;
      if (option && option !== visualizationRef.current) {
        selectVisualization(option);
      }
    },
  ).current;

  const handleTechniqueViewable = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<BreathingTechnique>[] }) => {
      const option = viewableItems.find((token) => token.isViewable)?.item;
      if (option && option !== breathingTechniqueRef.current) {
        selectTechnique(option);
      }
    },
  ).current;

  // the accessible < > alternative to swiping the technique carousel
  const stepTechnique = (delta: number) => {
    const index = techniqueIndex + delta;
    const option = TECHNIQUE_OPTIONS[index];
    if (!option) return;
    selectTechnique(option);
    techniqueListRef.current?.scrollToIndex({ index, animated: true });
  };

  const adjustDuration = (delta: number) => {
    interactedRef.current = true;
    const next = Math.min(
      MAX_SESSION_MINUTES,
      Math.max(MIN_SESSION_MINUTES, sessionDuration + delta),
    );
    if (next === sessionDuration) return;
    setSessionDuration(next);
    saveSetting(STORAGE_KEYS.duration, formatDuration(next));
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">SomaFlow</ThemedText>

      {/* Visualization picker — swipe between session animations */}
      <ThemedView style={styles.section}>
        <FlatList
          ref={visualizationListRef}
          data={VISUALIZATION_OPTIONS}
          keyExtractor={(option) => option}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.visualizationList}
          getItemLayout={(_, index) => ({
            length: VISUALIZATION_PAGE_WIDTH,
            offset: VISUALIZATION_PAGE_WIDTH * index,
            index,
          })}
          onViewableItemsChanged={handleVisualizationViewable}
          viewabilityConfig={VIEWABILITY_CONFIG}
          extraData={visualization}
          renderItem={({ item }) => (
            <View
              style={styles.visualizationPage}
              accessible
              accessibilityLabel={`${visualizations[item].label} visualisation`}
              accessibilityState={{ selected: item === visualization }}
            >
              <VisualizationPreview
                option={item}
                size={VISUALIZATION_PREVIEW_SIZE}
              />
              <ThemedText>{visualizations[item].label}</ThemedText>
            </View>
          )}
        />
        <ThemedView style={styles.dotRow}>
          {VISUALIZATION_OPTIONS.map((option, index) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={`Select ${visualizations[option].label}`}
              accessibilityState={{ selected: option === visualization }}
              onPress={() => {
                selectVisualization(option);
                visualizationListRef.current?.scrollToIndex({
                  index,
                  animated: true,
                });
              }}
              style={styles.dotButton}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      option === visualization ? colors.primary : colors.border,
                  },
                ]}
              />
            </Pressable>
          ))}
        </ThemedView>
      </ThemedView>

      {/* Technique picker — swipe or use the chevrons */}
      <ThemedView style={styles.section}>
        <ThemedView style={styles.techniqueRow}>
          <RoundIconButton
            icon="chevron-left"
            accessibilityLabel="Previous technique"
            onPress={() => stepTechnique(-1)}
            disabled={techniqueIndex <= 0}
          />
          <FlatList
            ref={techniqueListRef}
            data={TECHNIQUE_OPTIONS}
            keyExtractor={(option) => option}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.techniqueList}
            getItemLayout={(_, index) => ({
              length: TECHNIQUE_PAGE_WIDTH,
              offset: TECHNIQUE_PAGE_WIDTH * index,
              index,
            })}
            onViewableItemsChanged={handleTechniqueViewable}
            viewabilityConfig={VIEWABILITY_CONFIG}
            extraData={breathingTechnique}
            renderItem={({ item }) => (
              <View
                style={styles.techniquePage}
                accessible
                accessibilityState={{ selected: item === breathingTechnique }}
              >
                <ThemedText type="subtitle">{item}</ThemedText>
              </View>
            )}
          />
          <RoundIconButton
            icon="chevron-right"
            accessibilityLabel="Next technique"
            onPress={() => stepTechnique(1)}
            disabled={techniqueIndex >= TECHNIQUE_OPTIONS.length - 1}
          />
        </ThemedView>
        <ThemedText style={styles.techniqueDescription}>
          {techniques[breathingTechnique].description}
        </ThemedText>
      </ThemedView>

      {/* Session length — ±1 minute */}
      <ThemedView style={styles.durationRow}>
        <RoundIconButton
          icon="minus"
          accessibilityLabel="Decrease session length"
          onPress={() => adjustDuration(-1)}
          disabled={sessionDuration <= MIN_SESSION_MINUTES}
        />
        <ThemedText type="title" style={styles.durationText}>
          {sessionDuration} min
        </ThemedText>
        <RoundIconButton
          icon="plus"
          accessibilityLabel="Increase session length"
          onPress={() => adjustDuration(1)}
          disabled={sessionDuration >= MAX_SESSION_MINUTES}
        />
      </ThemedView>

      <Pressable
        onPress={() => router.push("/breathing")}
        style={[styles.button, { backgroundColor: colors.primary }]}
      >
        <ThemedText type="subtitle" style={{ color: "white" }}>
          Go to Breathing
        </ThemedText>
        <Feather name="play" size={24} color="white" />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  section: {
    alignItems: "center",
    gap: 4,
    backgroundColor: "transparent",
  },
  visualizationList: {
    width: VISUALIZATION_PAGE_WIDTH,
    flexGrow: 0,
  },
  visualizationPage: {
    width: VISUALIZATION_PAGE_WIDTH,
    alignItems: "center",
    gap: 2,
  },
  dotRow: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "transparent",
  },
  // pads each 8px dot to a 28px non-overlapping touch target
  dotButton: {
    padding: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  techniqueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "transparent",
  },
  techniqueList: {
    width: TECHNIQUE_PAGE_WIDTH,
    flexGrow: 0,
  },
  techniquePage: {
    width: TECHNIQUE_PAGE_WIDTH,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  // minHeight (not height, which clipped 3-line descriptions) keeps the
  // layout steady across techniques while letting long text show fully
  techniqueDescription: {
    textAlign: "center",
    marginHorizontal: 24,
    minHeight: 76,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    backgroundColor: "transparent",
  },
  durationText: {
    minWidth: 120,
    textAlign: "center",
  },
  button: {
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});
