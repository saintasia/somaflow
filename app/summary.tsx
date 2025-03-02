import { Image, StyleSheet, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { techniques } from '@/constants/techniques';
import { useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { countSessionsThisWeek } from '../utils';


export default function SummaryScreen() {
  const [lastSession, setLastSession] = useState<{ technique: keyof typeof techniques; duration: number; day: string }>({ technique: "Resonant", duration: 0, day: "" });
  const [totalSessions, setTotalSessions] = useState(0);
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0);
  const {colors} = useTheme();
  const router = useRouter();

  useEffect(() => {
    const loadSummary = async () => {
      const historyJson = await AsyncStorage.getItem("breathingHistory");
      const history = historyJson ? JSON.parse(historyJson) : [];

      if (history.length > 0) {
        setLastSession(history[0]); // get most recent session
      }

      const totalSessions = await AsyncStorage.getItem("totalSessions");
      setTotalSessions(totalSessions ? parseInt(totalSessions) : 0);

      const sessionsThisWeek = countSessionsThisWeek(history);
      setSessionsThisWeek(sessionsThisWeek);
    };

    loadSummary();
  }, []);

  return (
    <ThemedView type="scrollable" style={styles.container}>
      <Image source={require("@/assets/images/party-popper.png")} style={{ width: 97, height: 100, alignSelf: 'center' }} />
      <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
        <ThemedText type="subtitle">Great job!</ThemedText>
        <ThemedText>
          You’ve completed the {lastSession.technique} {lastSession.duration} min session.
          What is it for: {lastSession.technique && techniques[lastSession.technique].description}
        </ThemedText>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: colors.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <ThemedView style={{ gap: 10, backgroundColor: colors.card, flex: 1 }}>
          <ThemedText type="subtitle">Sessions so far</ThemedText>
          <ThemedText>
            Number of sessions you have completed since you started using the app.
          </ThemedText>
        </ThemedView>
        <ThemedText type="title" style={{ fontSize: 48, lineHeight: 48 }}>{totalSessions}</ThemedText>
      </ThemedView>

      <ThemedView style={[styles.card, { backgroundColor: colors.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <ThemedView style={{ gap: 10, backgroundColor: colors.card, flex: 1 }}>
          <ThemedText type="subtitle">This week</ThemedText>
          <ThemedText>
            See how many days this week you have completed a session.
          </ThemedText>
        </ThemedView>
        <ThemedText type="title" style={{ fontSize: 48, lineHeight: 48 }}>{sessionsThisWeek}</ThemedText>
      </ThemedView>
      
      <Pressable
        onPress={() => router.push("/")}
        style={[styles.button, { backgroundColor: colors.primary }]}
      >
        <ThemedText type="subtitle" style={{ color: 'white' }}>Go Home</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 40,
    flexDirection: 'column',
    gap: 10,
    backgroundColor: 'transparent',
  },
  card: {
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    flexDirection: 'column',
    gap: 10,
  },
  button: {
    padding: 10,
    paddingHorizontal: 20,
    borderRadius: 100,
    marginTop: 20,
    marginBottom: 80,
    fontSize: 30,
    alignSelf: 'center',
  },
})
