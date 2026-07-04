import { Image, StyleSheet, Pressable } from "react-native";
import { useState, useCallback } from "react";
import { BreathingTechnique } from "@/constants/techniques";
import { loadSettings } from "@/constants/storage";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";
import { useTheme, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  // states
  const [breathingTechnique, setBreathingTechnique] =
    useState<BreathingTechnique>("Resonant");
  const [sessionDuration, setSessionDuration] = useState(5);

  // reload the saved defaults whenever the tab regains focus, so changes made
  // in Settings are reflected here.
  useFocusEffect(
    useCallback(() => {
      loadSettings().then(({ technique, duration }) => {
        setBreathingTechnique(technique);
        setSessionDuration(duration);
      });
    }, []),
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.textContainer}>
        <ThemedText type="default" style={{ fontSize: 34, lineHeight: 34 }}>
          Welcome to
        </ThemedText>
        <ThemedText type="title">SomaFlow</ThemedText>
        <ThemedText style={{ textAlign: "center" }}>
          Breathing exercises for inner peace and balance
        </ThemedText>
      </ThemedView>
      <Image
        source={require("@/assets/images/background.png")}
        style={styles.image}
      />
      <Pressable
        onPress={() => router.push("/breathing")}
        style={[styles.button, { backgroundColor: colors.primary }]}
      >
        <ThemedText type="subtitle" style={{ color: "white" }}>
          Go to Breathing
        </ThemedText>
        <Feather name="play" size={24} color="white" />
      </Pressable>
      <ThemedText>
        {sessionDuration} minute {breathingTechnique} technique
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  textContainer: {
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    marginHorizontal: 60,
    marginBottom: -100,
    backgroundColor: "transparent",
  },
  image: {
    width: 400,
    height: 500,
    zIndex: 0,
  },
  button: {
    marginTop: -100,
    fontSize: 30,
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 100,
    flexDirection: "row",
    alignContent: "center",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});
