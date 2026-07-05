import { Image, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { GradientBackground } from '@/components/GradientBackground';
import { StatCard } from '@/components/StatCard';
import { useEffect, useState } from 'react';
import { techniques, describeTechnique } from '@/constants/techniques';
import {
  loadStats,
  loadCustomTechniques,
  type Session,
} from '@/constants/storage';
import { useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { countSessionsThisWeek } from '../utils';


export default function SummaryScreen() {
  const [lastSession, setLastSession] = useState<Session>({ technique: "Resonant", duration: 0, date: "" });
  const [lastDescription, setLastDescription] = useState("");
  const [totalSessions, setTotalSessions] = useState(0);
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0);
  const {colors} = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadSummary = async () => {
      const [{ history, totalSessions }, customs] = await Promise.all([
        loadStats(),
        loadCustomTechniques(),
      ]);

      if (history.length > 0) {
        setLastSession(history[0]); // get most recent session
        // resolve through the merged lookup: the technique may be custom, or
        // a custom one that has since been deleted (then show no description)
        const def =
          customs[history[0].technique] ?? techniques[history[0].technique];
        setLastDescription(def ? describeTechnique(def) : "");
      }

      setTotalSessions(totalSessions);
      setSessionsThisWeek(countSessionsThisWeek(history));
    };

    loadSummary();
  }, []);

  return (
    <GradientBackground>
      {/* the header is transparent (title + back chip float on the
          gradient), so the content starts below it */}
      <ThemedView
        type="scrollable"
        style={[styles.container, { paddingTop: insets.top + 72 }]}
      >
      <Image source={require("@/assets/images/party-popper.png")} style={{ width: 97, height: 100, alignSelf: 'center' }} />
      <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
        <ThemedText type="subtitle">Great job!</ThemedText>
        <ThemedText>
          You’ve completed the {lastSession.technique} {lastSession.duration} min session.
          {lastDescription ? ` What is it for: ${lastDescription}` : ""}
        </ThemedText>
      </ThemedView>

      <StatCard
        label="Sessions so far"
        description="Number of sessions you have completed since you started using the app."
        value={totalSessions}
        style={styles.statCard}
      />

      <StatCard
        label="This week"
        description="See how many days this week you have completed a session."
        value={sessionsThisWeek}
        style={styles.statCard}
      />

      <Pressable
        // navigate pops back to the existing home instead of stacking a new one
        onPress={() => router.navigate("/")}
        style={[styles.button, { backgroundColor: colors.primary }]}
      >
        <ThemedText type="subtitle" style={{ color: 'white' }}>Go Home</ThemedText>
      </Pressable>
      </ThemedView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexDirection: 'column',
    gap: 10,
    backgroundColor: 'transparent',
  },
  // card padding is 16 app-wide (StatCard, settings rows, progress cards)
  card: {
    padding: 16,
    borderRadius: 10,
    marginTop: 20,
    flexDirection: 'column',
    gap: 10,
  },
  statCard: {
    marginTop: 20,
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
