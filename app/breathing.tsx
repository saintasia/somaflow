import { StyleSheet, Animated, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GradientBackground } from "@/components/GradientBackground";
import { techniques } from "@/constants/techniques";
import { useTheme } from "@react-navigation/native";
import { useBreathingSession } from "@/hooks/useBreathingSession";

export default function BreathingScreen() {
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    lottieRef,
    lottieSpeed,
    visualizationSource,
    progress,
    breathingTechnique,
    sessionDuration,
    currentPhase,
    secondsLeft,
    isRunning,
    elapsedTime,
    sessionActive,
    handlePause,
  } = useBreathingSession();

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
            style={{ position: "absolute", top: 0, color: colors.primary }}
          >
            {currentPhase}
          </ThemedText>
        )}

        <LottieView
          ref={lottieRef}
          source={visualizationSource}
          loop={false}
          // lottieSpeed stretches the animation across the current phase;
          // speed 0 freezes the current frame on pause (reliable on the New Architecture)
          speed={isRunning ? lottieSpeed : 0}
          style={styles.animation}
        />

        {sessionActive && (
          <ThemedView
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
              style={[
                styles.countdownNumber,
                { color: dark ? colors.background : colors.primary },
              ]}
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
          <ThemedText style={{ position: "absolute", top: -20 }} type="title">
            {sessionDuration} min session
          </ThemedText>
        )}
      </ThemedView>
      {/* Progress Bar */}
      <ThemedView
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
        style={[styles.button, { backgroundColor: colors.primary }]}
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
          {techniques[breathingTechnique].description}
        </ThemedText>
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
  sessionArea: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
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
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  countdownNumber: {
    fontSize: 56,
    lineHeight: 64,
  },
  progressBarContainer: {
    width: "80%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 10,
  },
  progressBar: {
    height: "100%",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  footnote: {
    alignSelf: "stretch",
    marginHorizontal: 8,
    alignItems: "center",
    gap: 2,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  footnoteText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    opacity: 0.75,
  },
});
