import type { ComponentProps } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

// The round icon button used by the Breathe tab's pickers — the < > technique
// chevrons and the +/- duration stepper share this one size and themed look.
// The disabled state is dimmed and exposed to screen readers.
export function RoundIconButton({
  icon,
  accessibilityLabel,
  onPress,
  disabled = false,
}: {
  icon: ComponentProps<typeof Feather>["name"];
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={[
        styles.button,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Feather name={icon} size={22} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
