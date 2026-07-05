import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GradientBackground } from "@/components/GradientBackground";
import { StatCard } from "@/components/StatCard";
import { useTheme } from "@react-navigation/native";
import { loadStats, type Session } from "@/constants/storage";
import { getSessionsThisWeek } from "../../utils";

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ProgressScreen() {
  const { colors } = useTheme();

  const [sessionHistory, setSessionHistory] = useState<Session[]>([]);
  const [completedDays, setCompletedDays] = useState<{ [key: string]: boolean }>({});
  const [totalSessions, setTotalSessions] = useState(0);
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0);

  useEffect(() => {
    const loadProgress = async () => {
      const { history, totalSessions } = await loadStats();

      setSessionHistory(history);
      setTotalSessions(totalSessions);

      // filter history to include only sessions from this week
      const weeklySessions = getSessionsThisWeek(history);

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
    };

    loadProgress();
  }, []);

  return (
    <GradientBackground>
      <ThemedView type="scrollable" style={styles.container}>
      {/* Total Sessions */}
      <StatCard
        label="Sessions so far"
        description="Number of sessions you have completed since you started using the app."
        value={totalSessions}
      />

      {/* Weekly Completion */}
      <StatCard label="This week" description="Number of sessions this week" value={sessionsThisWeek}>
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
      </StatCard>

      {/* Last 20 Sessions — transparent wrappers (a default ThemedView would
          paint a flat block over the gradient), with enough bottom margin to
          scroll the last card clear of the floating tab pill */}
      <ThemedView
        style={{
          marginTop: 40,
          marginBottom: 120,
          backgroundColor: "transparent",
        }}
      >
        <ThemedText type="subtitle">Previous sessions:</ThemedText>
        <ThemedView style={{ backgroundColor: "transparent" }}>
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
    </GradientBackground>
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
  // card padding is 16 app-wide (StatCard, settings rows, summary card)
  card: {
    padding: 16,
    borderRadius: 10,
    marginTop: 10,
    flexDirection: 'column',
    gap: 10,
  },
});
