import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@react-navigation/native";

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ProgressScreen() {
  const { colors } = useTheme();

  interface Session {
    date: string;
    technique: string;
    duration: number;
  }

  const [sessionHistory, setSessionHistory] = useState<Session[]>([]);
  const [completedDays, setCompletedDays] = useState<{ [key: string]: boolean }>({});
  const [totalSessions, setTotalSessions] = useState(0);
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0);

  useEffect(() => {
    const loadProgress = async () => {
      const historyJson = await AsyncStorage.getItem("breathingHistory");
      const history: Session[] = historyJson ? JSON.parse(historyJson) : [];

      setSessionHistory(history);

      // filter history to include only sessions from this week
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // sunday of this week
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7); // next sunday

      const weeklySessions = history.filter((session) => {
        const sessionDate = new Date(session.date);
        return sessionDate >= startOfWeek && sessionDate < endOfWeek;
      });

      // update completed days
      const completedDaysTracker: { [key: string]: boolean } = {};
      weeklySessions.forEach((session) => {
        const sessionDate = new Date(session.date);
        const sessionDay = daysOfWeek[sessionDate.getDay()]; // Convert to weekday name
        completedDaysTracker[sessionDay] = true;
      });

      setCompletedDays(completedDaysTracker);

      // update weekly count
      setSessionsThisWeek(weeklySessions.length);

      // update total sessions
      const totalSessions = await AsyncStorage.getItem("totalSessions");
      setTotalSessions(totalSessions ? parseInt(totalSessions) : 0);
    };

    loadProgress();
  }, []);

  return (
    <ThemedView type="scrollable" style={styles.container}>
      {/* Total Sessions */}
      <ThemedView style={[styles.card, { backgroundColor: colors.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <ThemedView style={{ gap: 10, backgroundColor: colors.card, flex: 1 }}>
          <ThemedText type="subtitle">Sessions so far</ThemedText>
          <ThemedText>
            Number of sessions you have completed since you started using the app.
          </ThemedText>
        </ThemedView>
        <ThemedText type="title" style={{ fontSize: 48, lineHeight: 48 }}>{totalSessions}</ThemedText>
      </ThemedView>

      {/* Weekly Completion */}
      <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
        <ThemedView style={{ backgroundColor: colors.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <ThemedView style={{ gap: 10, backgroundColor: colors.card, flex: 1 }}>
            <ThemedText type="subtitle">This week</ThemedText>
            <ThemedText>Number of sessions this week</ThemedText>
          </ThemedView>
          <ThemedText type="title" style={{ fontSize: 48, lineHeight: 48 }}>{sessionsThisWeek}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.pillContainer}>
          {daysOfWeek.map(day => (
            <ThemedView
              key={day}
              style={[
                styles.dayPill,
                { backgroundColor: completedDays[day] ? colors.primary : colors.border },
              ]}
            >
              <ThemedText type="defaultSemiBold" lightColor={completedDays[day] ? "white" : colors.text}>
                {day.charAt(0)}
              </ThemedText>
            </ThemedView>
          ))}
        </ThemedView>
      </ThemedView>

      {/* Last 20 Sessions */}
      <ThemedView style={{ marginTop: 40, marginBottom: 80 }}>
        <ThemedText type="subtitle">Previous sessions:</ThemedText>
        <ThemedView>
          {sessionHistory.length > 0 ? (
            sessionHistory.slice(0, 20).map((session, index) => (
              <ThemedView key={index} style={[styles.card, { backgroundColor: colors.card }]}>
                <ThemedText type="defaultSemiBold">
                  {new Date(session.date).toLocaleDateString('en-US', { weekday: 'long' })}: {session.technique} ({session.duration} min)
                </ThemedText>
                <ThemedText>
                  {new Date(session.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </ThemedText>
              </ThemedView>
            ))
          ) : (
            <ThemedText>No sessions recorded yet.</ThemedText>
          )}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginTop: 40,
    flexDirection: "column",
    gap: 10,
    backgroundColor: "transparent",
  },
  optionRow: {
    padding: 16,
    gap: 6,
    flexDirection: "column",
    borderRadius: 10,
  },
  pillContainer: {
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  dayPill: {
    borderRadius: 40,
    marginVertical: 5,
    marginRight: 5,
    minWidth: 40,
    minHeight: 40,
    flex: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    padding: 20,
    borderRadius: 10,
    marginTop: 10,
    flexDirection: 'column',
    gap: 10,
  },
});
