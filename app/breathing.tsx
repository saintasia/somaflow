import { StyleSheet, Animated, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GradientBackground } from "@/components/GradientBackground";
import { FloatingSurface, scaleFont } from "@/constants/Theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useBreathingSession } from "@/hooks/useBreathingSession";

export default function BreathingScreen() {
  const { colors, dark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    lottieRef,
    lottieSpeed,
    visualizationSource,
    progress,
    breathingTechnique,
    techniqueDescription,
    isCustomTechnique,
    sessionDuration,
    currentPhase,
    secondsLeft,
    isRunning,
    elapsedTime,
    sessionActive,
    handlePause,
  } = useBreathingSession();

  // Editing pushes the technique editor over this screen: the focus-loss
  // safety net pauses the session, and the hook re-resolves the technique on
  // refocus, so an edit/rename/delete made there shows up on return.
  const handleEditTechnique = () => {
    router.push({
      pathname: "/technique-editor",
      params: { name: breathingTechnique },
    });
  };

  return (
    <GradientBackground style={styles.container}>
      {/* Everything except the footnote centers in the space above it, so
          the footnote card can never overlap the Start/Pause button */}
      <ThemedView style={styles.sessionArea}>
      {/* Lottie Animation — the focal point of the screen */}
      <ThemedView style={styles.animationContainer}>
        {sessionActive && (
          <ThemedText
            type="title"
            style={{
              position: "absolute",
              top: 0,
              // primary reads as blue against the dark gradient — use the
              // near-white text color there
              color: dark ? colors.text : colors.primary,
            }}
          >
            {currentPhase}
          </ThemedText>
        )}

        {/* the wrapper carries the accessibility-hiding props — the
            animation is decorative (the phase label and announcements carry
            the state), and LottieView's prop types don't accept them */}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <LottieView
            ref={lottieRef}
            source={visualizationSource}
            loop={false}
            // lottieSpeed stretches the animation across the current phase;
            // speed 0 freezes the current frame on pause (reliable on the New Architecture)
            speed={isRunning ? lottieSpeed : 0}
            style={styles.animation}
          />
        </View>

        {sessionActive && (
          <ThemedView
            // hidden from screen readers: it changes every second — focusing
            // it would spam stale numbers; the phase announcements already
            // state each phase's duration
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              ...styles.countdownOverlay,
              paddingTop:
                visualizationSource ===
                require("@/assets/animations/shape.json")
                  ? 140
                  : 0,
            }}
          >
            <ThemedText
              type="title"
              style={[styles.countdownNumber, { color: colors.countdown }]}
            >
              {secondsLeft}
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
      <ThemedView
        style={{
          position: "relative",
          width: "100%",
          flexDirection: "row",
          justifyContent: "center",
          backgroundColor: "transparent",
        }}
      >
        {elapsedTime === 0 && !isRunning && (
          <ThemedText style={{ position: "absolute", top: -28 }} type="title">
            {sessionDuration} min session
          </ThemedText>
        )}
      </ThemedView>
      {/* Progress Bar */}
      <ThemedView
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Session progress"
        accessibilityValue={{
          min: 0,
          max: sessionDuration * 60,
          now: elapsedTime,
        }}
        style={[
          styles.progressBarContainer,
          { backgroundColor: colors.border },
        ]}
      >
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
            { backgroundColor: colors.primary },
          ]}
        />
      </ThemedView>

      {/* Start / Pause / Continue button */}
      <Pressable
        // having to use onPressIn in a layout forces the button to also use onPressIn, has to do with React Native bug
        onPressIn={handlePause}
        accessibilityRole="button"
        // an explicit label: the visible one is assembled from conditional
        // texts plus an icon glyph, which screen readers read unreliably
        accessibilityLabel={
          isRunning
            ? "Pause session"
            : elapsedTime > 0
              ? "Continue session"
              : `Start ${sessionDuration} minute session`
        }
        style={[styles.button, { backgroundColor: colors.button }]}
      >
        <ThemedText type="subtitle" lightColor="white">
          {!isRunning && elapsedTime > 0 && "Continue"}
          {!isRunning && elapsedTime === 0 && "Start"}
          {isRunning && "Pause"}
        </ThemedText>
        <ThemedText type="default" lightColor="white">
          {isRunning ? (
            <Feather name="pause" size={24} />
          ) : (
            <Feather name="play" size={24} />
          )}
        </ThemedText>
      </Pressable>

      </ThemedView>

      {/* Technique footnote — an understated card kept above the bottom
          gesture area (insets keep it clear of e.g. the Pixel's nav bar) */}
      <ThemedView
        style={[
          styles.footnote,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            marginBottom: insets.bottom + 8,
          },
        ]}
      >
        <ThemedText type="defaultSemiBold" style={styles.footnoteText}>
          {breathingTechnique}
        </ThemedText>
        <ThemedText style={styles.footnoteText}>
          {techniqueDescription}
        </ThemedText>
        {/* user-created techniques can be edited (and deleted, from inside
            the editor) right here — a smaller sibling of the header's
            floating close chip */}
        {isCustomTechnique && (
          <Pressable
            // onPressIn for the same reason as the Start/Pause button above
            onPressIn={handleEditTechnique}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${breathingTechnique}`}
            style={[
              styles.editChip,
              {
                backgroundColor: FloatingSurface[dark ? "dark" : "light"],
                borderColor: colors.border,
              },
            ]}
          >
            <Feather name="edit-2" size={13} color={colors.text} />
          </Pressable>
        )}
      </ThemedView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "transparent",
  },
  // centered as one tight cluster: the progress bar and Start/Pause button
  // hug the visualization rather than settling down by the technique card.
  // paddingTop biases the cluster below true center, keeping breathing room
  // above the phase label ("Breathe in" etc.)
  sessionArea: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
    gap: 12,
    backgroundColor: "transparent",
  },
  animationContainer: {
    height: 380,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  animation: {
    width: 300,
    height: 300,
  },
  countdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  countdownNumber: {
    fontSize: scaleFont(56),
    lineHeight: scaleFont(64),
  },
  progressBarContainer: {
    width: "80%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    // sized to fit the widest label ("Continue") so the pill doesn't change
    // width as the label cycles through Start/Pause/Continue
    minWidth: 180,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  footnote: {
    alignSelf: "stretch",
    marginTop: 14,
    marginHorizontal: 8,
    alignItems: "center",
    gap: 2,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  footnoteText: {
    fontSize: scaleFont(13),
    lineHeight: scaleFont(18),
    textAlign: "center",
    opacity: 0.75,
  },
  editChip: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
