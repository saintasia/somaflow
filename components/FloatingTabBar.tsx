import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import {
  ActiveTabHighlight,
  TAB_BAR_HEIGHT,
  TAB_BAR_BOTTOM_OFFSET,
} from "@/constants/Theme";

// The app's tab bar (passed to <Tabs tabBar>): the tabs sit transparently on
// the background gradient — no surface, border, or shadow — and the active
// one is marked by a rounded square (under both the icon and the label) that
// slides between tabs on a spring. position:absolute means screens extend
// behind the bar, so content that can reach the bottom edge pads itself with
// FLOATING_TAB_CLEARANCE (constants/Theme.ts).
const HIGHLIGHT_SIZE = 64;

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const colorScheme = useColorScheme() ?? "light";
  const [barWidth, setBarWidth] = useState(0);
  const highlightX = useRef(new Animated.Value(0)).current;
  const placedRef = useRef(false);

  const itemWidth = barWidth / state.routes.length;
  const targetX = itemWidth * state.index + (itemWidth - HIGHLIGHT_SIZE) / 2;

  useEffect(() => {
    if (!barWidth) return;
    if (!placedRef.current) {
      // first layout: place the square on the active tab without sliding
      // in from x=0
      placedRef.current = true;
      highlightX.setValue(targetX);
      return;
    }
    Animated.spring(highlightX, {
      toValue: targetX,
      useNativeDriver: true,
      stiffness: 220,
      damping: 20,
      mass: 0.8,
    }).start();
  }, [barWidth, targetX, highlightX]);

  return (
    <View
      style={[styles.bar, { bottom: insets.bottom + TAB_BAR_BOTTOM_OFFSET }]}
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
    >
      {barWidth > 0 && (
        <Animated.View
          style={[
            styles.highlight,
            {
              backgroundColor: ActiveTabHighlight[colorScheme],
              transform: [{ translateX: highlightX }],
            },
          ]}
        />
      )}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused
          ? Colors[colorScheme].text
          : Colors[colorScheme].tabIconDefault;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={
              options.tabBarAccessibilityLabel ?? options.title
            }
            onPress={onPress}
            onLongPress={() =>
              navigation.emit({ type: "tabLongPress", target: route.key })
            }
            style={styles.item}
          >
            {options.tabBarIcon?.({ focused, color, size: 24 })}
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {options.title ?? route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT,
    flexDirection: "row",
    backgroundColor: "transparent",
  },
  // a perfect square (soft corners), tall enough to sit under the icon and
  // the label together
  highlight: {
    position: "absolute",
    left: 0,
    top: (TAB_BAR_HEIGHT - HIGHLIGHT_SIZE) / 2,
    width: HIGHLIGHT_SIZE,
    height: HIGHLIGHT_SIZE,
    borderRadius: 18,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontFamily: "InclusiveSansMedium",
  },
});
