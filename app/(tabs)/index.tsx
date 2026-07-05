import {
  StyleSheet,
  Pressable,
  FlatList,
  View,
  type ViewToken,
} from "react-native";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  techniques,
  describeTechnique,
  type BreathingTechnique,
  type TechniqueDef,
} from "@/constants/techniques";
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
  loadCustomTechniques,
  saveSetting,
  formatDuration,
} from "@/constants/storage";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { GradientBackground } from "@/components/GradientBackground";
import { VisualizationPreview } from "@/components/VisualizationPreview";
import { RoundIconButton } from "@/components/RoundIconButton";
import { useRouter } from "expo-router";
import { useTheme, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FLOATING_TAB_CLEARANCE } from "@/constants/Theme";
import { Feather } from "@expo/vector-icons";

// Every control shares this width — the visualization carousel, the technique
// and minutes rows (whose buttons pin to its left/right edges), and the
// Start breathing button — so the screen reads as one aligned column.
const CONTROL_WIDTH = 320;
const VISUALIZATION_PAGE_WIDTH = CONTROL_WIDTH;
const VISUALIZATION_PREVIEW_SIZE = 280;
// The minutes carousel pages by this fixed width (the FlatList is exactly one
// page wide), so swipes, the flanking buttons, and scrollToIndex all agree on
// offsets. The technique carousel pages by CONTROL_WIDTH: its pages hold the
// name and description, so a drag anywhere on either swipes it.
const DURATION_PAGE_WIDTH = 200;

// Every session length the minutes carousel offers, in order.
const DURATION_VALUES = Array.from(
  { length: MAX_SESSION_MINUTES - MIN_SESSION_MINUTES + 1 },
  (_, index) => MIN_SESSION_MINUTES + index,
);

// The technique carousel's pages: the built-in and custom techniques, then a
// final "create your own" page that opens the technique editor.
type TechniquePage =
  | { kind: "technique"; name: BreathingTechnique }
  | { kind: "create" };

// Selection follows the page filling the viewport (fires once a settling page
// crosses the threshold). This must stay viewability-based, NOT
// onMomentumScrollEnd: react-native-web never dispatches momentum events (the
// carousel would visibly snap but never save on web), and screen-reader
// initiated scrolls (TalkBack/VoiceOver) don't emit them either.
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const visualizationListRef = useRef<FlatList<Visualization>>(null);
  const techniqueListRef = useRef<FlatList<TechniquePage>>(null);
  const durationListRef = useRef<FlatList<number>>(null);

  // The session choices made here (visualization, technique, length) persist
  // immediately so the breathing screen reads them straight from storage.
  const [visualization, setVisualization] = useState<Visualization>("circle");
  const [breathingTechnique, setBreathingTechnique] =
    useState<BreathingTechnique>("Resonant");
  const [sessionDuration, setSessionDuration] = useState(5);
  // the user's own techniques, appended to the built-ins in the carousel
  const [customTechniques, setCustomTechniques] = useState<
    Record<string, TechniqueDef>
  >({});
  // which technique page is in view — unlike the selection it can also sit
  // on the trailing "create" page, so the chevrons step relative to it
  const [techniquePageIndex, setTechniquePageIndex] = useState(0);
  // a scroll queued by the focus reload, performed once the pages data
  // (including any customs) has actually committed to the FlatList
  const pendingTechniqueScrollRef = useRef<number | null>(null);

  const techniquePages: TechniquePage[] = [
    ...TECHNIQUE_OPTIONS.map((name) => ({ kind: "technique" as const, name })),
    ...Object.keys(customTechniques).map((name) => ({
      kind: "technique" as const,
      name,
    })),
    { kind: "create" as const },
  ];
  const techniqueDef = (name: BreathingTechnique): TechniqueDef =>
    customTechniques[name] ?? techniques[name];

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

      Promise.all([loadSettings(), loadCustomTechniques()]).then(
        ([{ technique, duration, visualization: saved }, customs]) => {
        if (!focused || interactedRef.current) return;
        setCustomTechniques(customs);
        setBreathingTechnique(technique);
        setSessionDuration(duration);
        setVisualization(saved);

        const savedTechniqueIndex = [
          ...TECHNIQUE_OPTIONS,
          ...Object.keys(customs),
        ].indexOf(technique);
        if (savedTechniqueIndex >= 0) {
          setTechniquePageIndex(savedTechniqueIndex);
          // the custom pages land in the FlatList on the next commit — the
          // scroll is queued and performed by the effect below
          pendingTechniqueScrollRef.current = savedTechniqueIndex;
        }
        const savedVisualizationIndex = VISUALIZATION_OPTIONS.indexOf(saved);
        if (savedVisualizationIndex >= 0) {
          visualizationListRef.current?.scrollToIndex({
            index: savedVisualizationIndex,
            animated: false,
          });
        }
        const savedDurationIndex = duration - MIN_SESSION_MINUTES;
        if (
          savedDurationIndex >= 0 &&
          savedDurationIndex < DURATION_VALUES.length
        ) {
          durationListRef.current?.scrollToIndex({
            index: savedDurationIndex,
            animated: false,
          });
        }
      });

      return () => {
        focused = false;
      };
    }, []),
  );

  // Perform a queued technique scroll once the pages (including customs) have
  // committed — scrolling in the same tick as setCustomTechniques could
  // target an index the FlatList doesn't hold yet and throw.
  useEffect(() => {
    const index = pendingTechniqueScrollRef.current;
    if (index == null) return;
    if (index < techniquePages.length) {
      techniqueListRef.current?.scrollToIndex({ index, animated: false });
    }
    pendingTechniqueScrollRef.current = null;
  });

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

  const selectDuration = (minutes: number) => {
    interactedRef.current = true;
    setSessionDuration(minutes);
    saveSetting(STORAGE_KEYS.duration, formatDuration(minutes));
  };

  // The FlatList forbids swapping onViewableItemsChanged between renders, so
  // the handlers are created once and read the live selection from refs.
  const visualizationRef = useRef(visualization);
  visualizationRef.current = visualization;
  const breathingTechniqueRef = useRef(breathingTechnique);
  breathingTechniqueRef.current = breathingTechnique;
  const sessionDurationRef = useRef(sessionDuration);
  sessionDurationRef.current = sessionDuration;

  const handleVisualizationViewable = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<Visualization>[] }) => {
      const option = viewableItems.find((token) => token.isViewable)?.item;
      if (option && option !== visualizationRef.current) {
        selectVisualization(option);
      }
    },
  ).current;

  const handleTechniqueViewable = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<TechniquePage>[] }) => {
      const token = viewableItems.find((t) => t.isViewable);
      if (!token || token.index == null) return;
      setTechniquePageIndex(token.index);
      if (token.item.kind === "create") {
        // swiping to the create page is an interaction too — a late settings
        // load must not yank the carousel back to the saved technique
        interactedRef.current = true;
        return;
      }
      if (token.item.name !== breathingTechniqueRef.current) {
        selectTechnique(token.item.name);
      }
    },
  ).current;

  const handleDurationViewable = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<number>[] }) => {
      const minutes = viewableItems.find((token) => token.isViewable)?.item;
      if (minutes && minutes !== sessionDurationRef.current) {
        selectDuration(minutes);
      }
    },
  ).current;

  // the accessible < > alternative to swiping the technique carousel; steps
  // through the pages (the trailing create page included, without selecting it)
  const stepTechnique = (delta: number) => {
    const index = techniquePageIndex + delta;
    const page = techniquePages[index];
    if (!page) return;
    interactedRef.current = true;
    setTechniquePageIndex(index);
    if (page.kind === "technique") {
      selectTechnique(page.name);
    }
    techniqueListRef.current?.scrollToIndex({ index, animated: true });
  };

  // the accessible ± alternative to swiping the minutes carousel
  const adjustDuration = (delta: number) => {
    const next = Math.min(
      MAX_SESSION_MINUTES,
      Math.max(MIN_SESSION_MINUTES, sessionDuration + delta),
    );
    if (next === sessionDuration) return;
    selectDuration(next);
    durationListRef.current?.scrollToIndex({
      index: next - MIN_SESSION_MINUTES,
      animated: true,
    });
  };

  return (
    <GradientBackground
      style={[
        styles.container,
        // the tab bar floats over the screen, so keep the bottom of the
        // column (the Start button) clear of it
        { paddingBottom: insets.bottom + FLOATING_TAB_CLEARANCE },
      ]}
    >
      <ThemedText type="title" style={{ marginTop: insets.top + 16 }}>
        SomaFlow
      </ThemedText>

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

      {/* Technique picker — a drag anywhere on the name or description
          swipes it; the chevrons float over the name row's edges. The last
          page creates a new technique. */}
      <ThemedView style={styles.techniqueBlock}>
        <FlatList
          ref={techniqueListRef}
          data={techniquePages}
          keyExtractor={(page) =>
            page.kind === "create" ? "__create__" : page.name
          }
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.techniqueList}
          getItemLayout={(_, index) => ({
            length: CONTROL_WIDTH,
            offset: CONTROL_WIDTH * index,
            index,
          })}
          onViewableItemsChanged={handleTechniqueViewable}
          viewabilityConfig={VIEWABILITY_CONFIG}
          extraData={[breathingTechnique, customTechniques]}
          renderItem={({ item }) => {
            if (item.kind === "create") {
              return (
                <Pressable
                  style={styles.techniquePage}
                  accessibilityRole="button"
                  accessibilityLabel="Create your own technique"
                  onPress={() => router.push("/technique-editor")}
                >
                  <View style={[styles.techniqueNameRow, styles.createRow]}>
                    <Feather name="plus" size={20} color={colors.primary} />
                    <ThemedText type="subtitle">Create your own</ThemedText>
                  </View>
                  <ThemedText style={styles.techniqueDescription}>
                    Name it and set the pace of every phase
                  </ThemedText>
                </Pressable>
              );
            }
            const pageContent = (
              <>
                <View style={styles.techniqueNameRow}>
                  <ThemedText type="subtitle">{item.name}</ThemedText>
                </View>
                <ThemedText style={styles.techniqueDescription}>
                  {describeTechnique(techniqueDef(item.name))}
                </ThemedText>
              </>
            );
            // tapping a user-created technique opens it in the editor;
            // built-ins aren't editable, so their pages aren't tappable
            return item.name in customTechniques ? (
              <Pressable
                style={styles.techniquePage}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}. Opens the technique editor`}
                accessibilityState={{
                  selected: item.name === breathingTechnique,
                }}
                onPress={() =>
                  router.push({
                    pathname: "/technique-editor",
                    params: { name: item.name },
                  })
                }
              >
                {pageContent}
              </Pressable>
            ) : (
              <View
                style={styles.techniquePage}
                accessible
                accessibilityState={{
                  selected: item.name === breathingTechnique,
                }}
              >
                {pageContent}
              </View>
            );
          }}
        />
        <View style={styles.chevronLeft}>
          <RoundIconButton
            icon="chevron-left"
            accessibilityLabel="Previous technique"
            onPress={() => stepTechnique(-1)}
            disabled={techniquePageIndex <= 0}
          />
        </View>
        <View style={styles.chevronRight}>
          <RoundIconButton
            icon="chevron-right"
            accessibilityLabel="Next technique"
            onPress={() => stepTechnique(1)}
            disabled={techniquePageIndex >= techniquePages.length - 1}
          />
        </View>
      </ThemedView>

      {/* Session length — swipe the minutes or step ±1 */}
      <ThemedView style={styles.pickerRow}>
        <RoundIconButton
          icon="minus"
          accessibilityLabel="Decrease session length"
          onPress={() => adjustDuration(-1)}
          disabled={sessionDuration <= MIN_SESSION_MINUTES}
        />
        <FlatList
          ref={durationListRef}
          data={DURATION_VALUES}
          keyExtractor={(minutes) => String(minutes)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.durationList}
          getItemLayout={(_, index) => ({
            length: DURATION_PAGE_WIDTH,
            offset: DURATION_PAGE_WIDTH * index,
            index,
          })}
          // the default selection (5 min) isn't the first page, so the list
          // must start there — otherwise the initial viewability callback
          // would "select" 1 min and overwrite the saved length
          initialScrollIndex={sessionDuration - MIN_SESSION_MINUTES}
          onViewableItemsChanged={handleDurationViewable}
          viewabilityConfig={VIEWABILITY_CONFIG}
          extraData={sessionDuration}
          renderItem={({ item }) => (
            <View
              style={styles.durationPage}
              accessible
              accessibilityLabel={`${item} minute session`}
              accessibilityState={{ selected: item === sessionDuration }}
            >
              <ThemedText type="title">{item} min</ThemedText>
            </View>
          )}
        />
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
          Start breathing
        </ThemedText>
        <Feather name="play" size={24} color="white" />
      </Pressable>
    </GradientBackground>
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
  // the minutes row: fixed width with the ± buttons pinned to the
  // leftmost/rightmost edges, so it lines up with the technique block's
  // chevrons and the Start button as one column
  pickerRow: {
    width: CONTROL_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
  },
  techniqueBlock: {
    width: CONTROL_WIDTH,
    backgroundColor: "transparent",
  },
  techniqueList: {
    width: CONTROL_WIDTH,
    flexGrow: 0,
  },
  techniquePage: {
    width: CONTROL_WIDTH,
    alignItems: "center",
    gap: 4,
  },
  // same height as the RoundIconButton chevrons overlaying its edges
  techniqueNameRow: {
    height: 44,
    justifyContent: "center",
  },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chevronLeft: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  chevronRight: {
    position: "absolute",
    right: 0,
    top: 0,
  },
  // minHeight (not height, which clipped 3-line descriptions) keeps the
  // layout steady across techniques while letting long text show fully
  techniqueDescription: {
    paddingHorizontal: 16,
    textAlign: "center",
    minHeight: 76,
  },
  durationList: {
    width: DURATION_PAGE_WIDTH,
    flexGrow: 0,
  },
  durationPage: {
    width: DURATION_PAGE_WIDTH,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    width: CONTROL_WIDTH,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});
