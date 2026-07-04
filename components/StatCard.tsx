import { ReactNode } from "react";
import { StyleSheet, type ViewProps } from "react-native";
import { useTheme } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

type StatCardProps = {
  label: string;
  description: string;
  value: number | string;
  // Optional content rendered below the label/value header row — e.g. the
  // weekday dots on the Progress "This week" card.
  children?: ReactNode;
  style?: ViewProps["style"];
};

// A themed card showing a stat: a label + description on the left and a large
// value on the right. Shared by the Progress and Summary screens so their
// "Sessions so far" / "This week" tiles stay visually identical.
export function StatCard({ label, description, value, children, style }: StatCardProps) {
  const { colors } = useTheme();

  return (
    <ThemedView style={[styles.card, { backgroundColor: colors.card }, style]}>
      <ThemedView style={[styles.header, { backgroundColor: colors.card }]}>
        <ThemedView style={[styles.textColumn, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">{label}</ThemedText>
          <ThemedText>{description}</ThemedText>
        </ThemedView>
        <ThemedText type="title" style={styles.value}>
          {value}
        </ThemedText>
      </ThemedView>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 10,
    marginTop: 10,
    flexDirection: "column",
    gap: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textColumn: {
    gap: 10,
    flex: 1,
  },
  value: {
    fontSize: 48,
    lineHeight: 48,
  },
});
