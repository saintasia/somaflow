import { StyleSheet, Pressable, Linking } from "react-native";
import type { ComponentProps } from "react";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GradientBackground } from "@/components/GradientBackground";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { FLOATING_TAB_CLEARANCE, MutedText } from "@/constants/Theme";
import { LINKS } from "@/constants/links";

// The leading icon sits inline with the title; the description below indents
// by the icon's width + gap so both lines of text share a left edge.
const ICON_SIZE = 22;
const ICON_GAP = 14;

// A card that opens a companion-website page in the browser (system browser
// on iOS/Android; react-native-web opens a new tab, so the app stays put).
function LinkRow({
  icon,
  title,
  description,
  url,
}: {
  icon: ComponentProps<typeof Feather>["name"];
  title: string;
  description: string;
  url: string;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={title}
      accessibilityHint="Opens in your browser"
      onPress={() => Linking.openURL(url)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <ThemedView style={styles.titleRow}>
        <Feather name={icon} size={ICON_SIZE} color={colors.iconAccent} />
        <ThemedText type="subtitle">{title}</ThemedText>
      </ThemedView>
      <ThemedText style={styles.description}>{description}</ThemedText>
      <Feather
        name="external-link"
        size={ICON_SIZE}
        color={colors.iconAccent}
        style={styles.externalIcon}
      />
    </Pressable>
  );
}

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const version = Constants.expoConfig?.version;

  return (
    <GradientBackground>
      <ThemedView type="scrollable" style={styles.scroll}>
        <ThemedView
          style={[
            styles.container,
            // all tab pages start their content at the same offset (see
            // Progress) and keep the bottom clear of the floating tab bar
            {
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + FLOATING_TAB_CLEARANCE,
            },
          ]}
        >
          <LinkRow
            icon="info"
            title="About SomaFlow"
            description="About the app"
            url={LINKS.about}
          />
          <LinkRow
            icon="book-open"
            title="The science"
            description="Research behind the breathing techniques"
            url={LINKS.research}
          />
          <LinkRow
            icon="message-circle"
            title="Feedback & help"
            description="Report a problem, share an idea or support"
            url={LINKS.feedback}
          />
          <LinkRow
            icon="shield"
            title="Privacy"
            description="Your data stays on your device"
            url={LINKS.privacy}
          />
          {/* not a link — handy to quote in bug reports */}
          {version && (
            <ThemedText
              style={[styles.version, { color: MutedText[colorScheme] }]}
            >
              SomaFlow v{version}
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  // let the GradientBackground behind the ScrollView show through
  scroll: {
    backgroundColor: "transparent",
  },
  container: {
    paddingHorizontal: 20,
    flexDirection: "column",
    gap: 10,
    backgroundColor: "transparent",
  },
  // card padding is 16 app-wide (StatCard, settings rows, progress/summary)
  card: {
    padding: 16,
    borderRadius: 10,
    gap: 2,
  },
  // inner row stays transparent — the translucent card tint would stack
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ICON_GAP,
    backgroundColor: "transparent",
    // keep the title clear of the absolutely-positioned external-link icon
    paddingRight: ICON_SIZE + ICON_GAP,
  },
  description: {
    marginLeft: ICON_SIZE + ICON_GAP,
  },
  externalIcon: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  version: {
    textAlign: "center",
    marginTop: 10,
  },
});
