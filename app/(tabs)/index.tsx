import { Image, StyleSheet, Pressable } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BreathingTechnique } from '@/constants/techniques';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  // States
  const [breathingTechnique, setBreathingTechnique] = useState<BreathingTechnique>("Resonant");
  const [sessionDuration, setSessionDuration] = useState(5);

  useEffect(() => {
    const loadSettings = async () => {
      const savedTechnique = await AsyncStorage.getItem("breathingTechnique") as BreathingTechnique;
      const savedDuration = await AsyncStorage.getItem("sessionDuration");

      if (savedTechnique) setBreathingTechnique(savedTechnique);
      if (savedDuration) setSessionDuration(parseInt(savedDuration.replace("min", ""), 10));
    };
    loadSettings();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.textContainer}>
        <ThemedText type="default" style={{fontSize: 34, lineHeight: 34 }}>Welcome to</ThemedText>
        <ThemedText type="title">SomaFlow</ThemedText>
        <ThemedText style={{ textAlign: 'center' }}>Breathing exercises for inner peace and balance</ThemedText>
      </ThemedView>
      <Image source={require("@/assets/images/background.png")} style={styles.image} />
      <Pressable
        onPress={() => router.push("/breathing")}
        style={[styles.button, { backgroundColor: colors.primary }]}
      >
        <ThemedText type="subtitle" style={{ color: 'white'}}>Go to Breathing</ThemedText>
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  textContainer: {
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginHorizontal: 60,
    marginBottom: -100,
    backgroundColor: 'transparent',
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
    flexDirection: 'row',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
})
