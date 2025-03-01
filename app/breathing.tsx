import { useState, useEffect, useRef } from "react";
import { StyleSheet, Platform, Vibration, Animated, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { techniques, type BreathingTechnique } from "@/constants/techniques";
import * as Haptics from "expo-haptics";
import { useTheme } from "@react-navigation/native";
import {useRouter} from 'expo-router';
import { Audio } from 'expo-av';

const inhaleSounds: { [key: number]: any } = {
  4: require('@/assets/sounds/breathe-in-4.mp3'),
};

const exhaleSounds: { [key: number]: any } = {
  4: require('@/assets/sounds/breathe-out-4.mp3'),
  6: require('@/assets/sounds/breathe-out-6.mp3'),
  8: require('@/assets/sounds/breathe-out-8.mp3'),
};

export default function BreathingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const lottieRef = useRef<LottieView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  // States
  const [breathingTechnique, setBreathingTechnique] = useState<BreathingTechnique>("Resonant");
  const [sessionDuration, setSessionDuration] = useState(5);
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [currentPhase, setCurrentPhase] = useState("Inhale");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // sound player
  const playSound = async (type: "inhale" | "exhale", duration: number) => {
    if (!isSoundEnabled) return; // don't play if sound is disabled
  
    const soundFile = type === "inhale" ? inhaleSounds[duration] : exhaleSounds[duration];
  
    if (!soundFile) return; // no matching sound file
  
    if (soundRef.current) {
      await soundRef.current.unloadAsync(); // unload previous sound
      soundRef.current = null;
    }
  
    const { sound } = await Audio.Sound.createAsync(soundFile);
    soundRef.current = sound; // ensure sound is stored in ref
    await sound.playAsync();
  };  

  const handlePause = async () => {
    setIsRunning(!isRunning); // toggle state
  
    if (!isRunning && soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  // saved settings
  useEffect(() => {
    const loadSettings = async () => {
      const savedTechnique = await AsyncStorage.getItem("breathingTechnique") as BreathingTechnique;
      const savedDuration = await AsyncStorage.getItem("sessionDuration");
      const savedVibration = await AsyncStorage.getItem("isVibrationEnabled");
      const savedSound = await AsyncStorage.getItem("isSoundEnabled");

      if (savedTechnique) setBreathingTechnique(savedTechnique);
      if (savedDuration) setSessionDuration(parseInt(savedDuration.replace("min", ""), 10));
      if (savedVibration) setIsVibrationEnabled(JSON.parse(savedVibration));
      if (savedSound) setIsSoundEnabled(JSON.parse(savedSound));
    };
    loadSettings();
  }, []);

  const selectedPattern = techniques[breathingTechnique] || techniques.Resonant;

  // breathing logic
  useEffect(() => {
    if (!isRunning) return; // only run if session is active
  
    let i = 0;
    const totalSessionTime = sessionDuration * 60;
    let elapsedTimeLocal = elapsedTime; // maintain paused time
  
    const pattern = [
      { phase: "Inhale", duration: selectedPattern.pattern.inhale, animationRange: [0, 100] },
      { phase: "Hold in", duration: selectedPattern.pattern.hold || 0, animationRange: [100, 100] },
      { phase: "Exhale", duration: selectedPattern.pattern.exhale, animationRange: [100, 0] },
      { phase: "Hold out", duration: selectedPattern.pattern.hold2 || 0, animationRange: [0, 0] },
    ].filter((step) => step.duration > 0);
  
    let cycleActive = true;
  
    // Progress bar animation
    Animated.timing(progress, {
      toValue: 1,
      duration: (totalSessionTime - elapsedTimeLocal) * 1000, // adjust for pause
      useNativeDriver: false,
    }).start(() => {
      if (elapsedTimeLocal >= totalSessionTime) {
        console.log("Session complete, setting sessionCompleted = true");
        setSessionCompleted(true); // mark session as completed if time lapsed
      }
    });
  
    const runBreathingCycle = async () => {
      let soundInstance;
    
      while (cycleActive && elapsedTimeLocal < totalSessionTime) {
        if (!isRunning) return; // pause loop when session is paused
    
        const { phase, duration, animationRange } = pattern[i];
    
        setCurrentPhase(phase);
        lottieRef.current?.play(animationRange[0], animationRange[1]);
    
        if (isSoundEnabled) {
          if (phase === "Inhale") {
            soundInstance = await playSound("inhale", duration);
          } else if (phase === "Exhale") {
            soundInstance = await playSound("exhale", duration);
          }
        }
    
        if (isVibrationEnabled && phase !== "Hold in" && phase !== "Hold out") {
          if (Platform.OS === "android") {
            Vibration.vibrate([500, 600, 500], false);
          } else if (Platform.OS === "ios") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }
    
        await new Promise((resolve) => setTimeout(resolve, duration * 1000));
    
        elapsedTimeLocal += duration;
        setElapsedTime(elapsedTimeLocal);
        i = (i + 1) % pattern.length;

        if (elapsedTimeLocal >= totalSessionTime) {
          console.log("Marking session as completed in breathing cycle");
          setSessionCompleted(true);
          return;
        }
      }
    };
    
  
    runBreathingCycle();
  
    return () => {
      cycleActive = false;
      lottieRef.current?.reset();
      Vibration.cancel();
    };
  }, [breathingTechnique, isVibrationEnabled, isRunning, isSoundEnabled]);

  useEffect(() => {
    if (sessionCompleted) {
      const saveSession = async () => {
        const today = new Date();
        // get existing history
        const historyJson = await AsyncStorage.getItem("breathingHistory");
        let history = historyJson ? JSON.parse(historyJson) : [];
  
        // ensure only last 30 sessions are stored to save space
        history = [
          { technique: breathingTechnique, duration: sessionDuration, date: today.toISOString() },
          ...history.slice(0, 29) // keep only 30 most recent
        ];
  
        await AsyncStorage.setItem("breathingHistory", JSON.stringify(history));
  
        // increment total sessions
        const totalSessions = await AsyncStorage.getItem("totalSessions");
        const newTotal = totalSessions ? parseInt(totalSessions) + 1 : 1;
        await AsyncStorage.setItem("totalSessions", newTotal.toString());
  
        router.push("/summary");
      };
  
      saveSession();
    }
  }, [sessionCompleted]);
  

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{breathingTechnique}</ThemedText>
      {isRunning ? (
        <ThemedView style={styles.topContainer}>
          <ThemedText type="default" style={{textAlign: "center"}}>Follow the animation, you can change settings anytime.</ThemedText>
        </ThemedView>
      ) : (
        <ThemedView style={styles.topContainer}>
          <ThemedText type="default" style={{textAlign: "center"}}>{techniques[breathingTechnique].description}</ThemedText>
        </ThemedView>
      )}

      {/* Lottie Animation */}
      <ThemedView style={styles.animationContainer}>
        { isRunning && <ThemedText type="title" style={{ position: 'absolute', top: 0, color: colors.primary}}>{currentPhase}</ThemedText>}

        <LottieView
          ref={lottieRef}
          source={require("@/assets/animations/breathing.json")}
          loop={false}
          style={styles.animation}
        />
      </ThemedView>
      <ThemedView style={{ position: "relative", width: "100%", flexDirection: "row", justifyContent: "center"}}>
      {elapsedTime === 0 && !isRunning && (
        <ThemedText style={{ position: "absolute", top: -20}} type="title">{sessionDuration} min session</ThemedText>
      )}
      </ThemedView>
      {/* Progress Bar */}
      <ThemedView style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.progressBar,
            { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
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
          {(!isRunning && elapsedTime > 0) && "Continue"}
          {(!isRunning && elapsedTime === 0) && "Start"}
          {isRunning && "Pause"}
        </ThemedText>
        <ThemedText type="default" lightColor="white">
        {isRunning ? <Feather name="pause" size={24} /> : <Feather name="play" size={24} />}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    backgroundColor: "transparent",
    position: "relative",
  },
  topContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "transparent",
    height: 80,
  },
  animationContainer: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  animation: {
    width: 220,
    height: 220,
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
});
