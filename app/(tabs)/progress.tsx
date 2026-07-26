import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pill, FLOATING_TAB_CLEARANCE } from "@/constants/Theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GradientBackground } from "@/components/GradientBackground";
import { EdgeFade } from "@/components/EdgeFade";
import { StatCard } from "@/components/StatCard";
import { useAppTheme } from "@/hooks/useAppTheme";
import { loadStats, type Session } from "@/constants/storage";
import { getSessionsThisWeek } from "../../utils";

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ProgressScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [sessionHistory, setSessionHistory] = useState<Session[]>([]);
  const [completedDays, setCompletedDays] = useState<{ [key: string]: boolean }>({});
  const [totalSessions, setTotalSessions] = useState(0);
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0);

  // The edge fades only make sense when the list actually scrolls — over a
  // half-empty region they'd read as a stray band of shading on the
  // gradient. Compare the list's content height against its viewport.
  const [listOverflows, setListOverflows] = useState(false);
  const listViewportHeight = useRef(0);
  const listContentHeight = useRef(0);
  const updateListOverflow = () =>
    setListOverflows(
      listContentHeight.current > listViewportHeight.current + 1,
    );

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
      {/* The whole page scrolls as one container, bounded above the floating
          tab bar — so the transparent tabs always sit on bare gradient — and
          content dissolves into full-width EdgeFades at the cut-off edges
          instead of clipping on a hard line */}
      <View
        style={[
          styles.scrollRegion,
          { marginBottom: insets.bottom + FLOATING_TAB_CLEARANCE },
        ]}
      >
      <ThemedView
        type="scrollable"
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24 },
        ]}
        onLayout={(event) => {
          listViewportHeight.current = event.nativeEvent.layout.height;
          updateListOverflow();
        }}
        onContentSizeChange={(_width, height) => {
          listContentHeight.current = height;
          updateListOverflow();
        }}
      >
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
                {
                  // completed days share the settings pills' active fill —
                  // invariant across schemes, so the label is Pill-styled too
                  backgroundColor: completedDays[day]
                    ? Pill.activeFill
                    : colors.inactivePill,
                },
              ]}
            >
              <ThemedText
                type="defaultSemiBold"
                style={{
                  color: completedDays[day] ? Pill.activeLabel : colors.text,
                }}
              >
                {day.charAt(0)}
              </ThemedText>
              {completedDays[day] && (
                <View
                  style={[
                    styles.checkBadge,
                    { backgroundColor: Pill.badgeFill },
                  ]}
                >
                  <Feather name="check" size={10} color={Pill.activeFill} />
                </View>
              )}
            </ThemedView>
          ))}
        </ThemedView>
      </StatCard>

      {/* Last 20 Sessions — transparent wrappers (a default ThemedView
          would paint a flat block over the gradient) */}
      <ThemedText type="subtitle" style={styles.listHeading}>
        Previous sessions:
      </ThemedText>
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
      {listOverflows && (
        <>
          <EdgeFade edge="top" height={insets.top + 24} />
          <EdgeFade edge="bottom" height={56} />
        </>
      )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  // full-bleed anchor for the ScrollView and the EdgeFades pinned to its
  // cut-off edges; its bottom margin (set inline with the safe-area inset)
  // keeps everything clear of the floating tab bar
  scrollRegion: {
    flex: 1,
  },
  // let the GradientBackground behind the ScrollView show through
  scroll: {
    backgroundColor: "transparent",
  },
  // bottom padding keeps the last card clear of the bottom fade (56) at
  // rest; top padding (set inline) starts content below the top fade
  content: {
    paddingHorizontal: 20,
    paddingBottom: 56,
    gap: 10,
  },
  listHeading: {
    marginTop: 30,
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
  // completion badge riding the pill's top-right corner: a check inside its
  // own small circle (the second, non-colour completion cue after the fill)
  checkBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
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
