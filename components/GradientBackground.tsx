import { StyleSheet, View, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "expo-router/react-navigation";
import { BackgroundGradients } from "@/constants/Theme";

// The app-wide screen backdrop: a soft themed gradient (BackgroundGradients
// in constants/Theme.ts) painted behind the screen's content. Use it as a
// screen's root in place of a background-colored ThemedView — inner views
// should stay transparent, and any ScrollView scrolls over the fixed gradient.
export function GradientBackground({ style, children, ...rest }: ViewProps) {
  const { dark } = useTheme();

  return (
    <View style={[styles.fill, style]} {...rest}>
      <LinearGradient
        colors={BackgroundGradients[dark ? "dark" : "light"]}
        // a gentle diagonal so the depth doesn't read as a flat vertical fade
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
