import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "@/hooks/useColorScheme";
import { EdgeFades } from "@/constants/Theme";

// A soft gradient overlay for the cut-off edge of a bounded scroll region
// (the Progress page): content dissolves into the background gradient
// (EdgeFades in constants/Theme.ts) as it scrolls out instead of clipping
// on a hard line. Render it after the region's ScrollView, inside the same
// wrapper View — it pins itself to that wrapper's top or bottom edge. Give
// the scroll content enough end padding that items at rest sit clear of the
// fade, and only render it when the content actually overflows — over a
// non-scrolling region it reads as a stray band of shading.
export function EdgeFade({
  edge,
  height,
}: {
  edge: "top" | "bottom";
  height: number;
}) {
  const colorScheme = useColorScheme() ?? "light";

  return (
    <LinearGradient
      colors={EdgeFades[colorScheme][edge]}
      // full-opacity plateau at the outer edge (hiding the clip line), then
      // an eased ramp to transparent
      locations={edge === "top" ? [0, 0.4, 1] : [0, 0.6, 1]}
      pointerEvents="none"
      style={[
        styles.fade,
        edge === "top" ? styles.top : styles.bottom,
        { height },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
});
