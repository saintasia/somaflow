import { useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import {
  ActiveTabHighlight,
  TAB_BAR_HEIGHT,
  TAB_BAR_BOTTOM_OFFSET,
  TAB_BAR_MAX_WIDTH,
} from "@/constants/Theme";

// The app's tab bar (passed to <Tabs tabBar>): the tabs sit transparently on
// the background gradient — no surface, border, or shadow — and the active
// one is marked by a rounded square (under both the icon and the label) that
// slides between tabs on a spring. Switch tabs by tapping, or by dragging
// anywhere along the bar — the drag slides through the tabs like pages
// (drag left = next tab, drag right = previous), the highlight settling on
// the nearest tab on release. The row caps at TAB_BAR_MAX_WIDTH and
// centers — sized so the visible icons/labels optically match the Breathe
// tab's Start-button column (see the constant's comment) instead of
// stretching across an iPad. position:absolute means screens extend
// behind the bar, so content that can reach the bottom edge pads itself with
// FLOATING_TAB_CLEARANCE (constants/Theme.ts) — long lists (Progress) scroll
// in a bounded region that ends above the bar instead of running under it.
const HIGHLIGHT_SIZE = 64;

// one spring for every way the highlight settles: tab presses, drag releases
const HIGHLIGHT_SPRING = {
  useNativeDriver: true,
  stiffness: 220,
  damping: 20,
  mass: 0.8,
} as const;

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const colorScheme = useColorScheme() ?? "light";
  const [barWidth, setBarWidth] = useState(0);
  // lazy useState (not useRef(...).current): a stable instance without
  // reading a ref during render, which react-hooks/refs forbids
  const [highlightX] = useState(() => new Animated.Value(0));
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
      ...HIGHLIGHT_SPRING,
      toValue: targetX,
    }).start();
  }, [barWidth, targetX, highlightX]);

  // The bar can also be dragged: a horizontal drag anywhere on it slides
  // through the tabs like pages (left = next, right = previous) and lands on
  // the nearest tab on release. Taps still land on the tab Pressables —
  // the drag only claims the touch once it moves decisively sideways. The
  // responder is created once (lazy useState) and reads the live layout and
  // selection from a ref mirrored each render, the codebase's pattern for
  // stable gesture/viewability handlers.
  const dragContextRef = useRef({ barWidth, state, navigation });
  useEffect(() => {
    dragContextRef.current = { barWidth, state, navigation };
  });
  const dragXRef = useRef(0);
  const [panResponder] = useState(() => {
    const settle = (cancelled: boolean) => {
      const { barWidth, state, navigation } = dragContextRef.current;
      if (!barWidth) return;
      const itemWidth = barWidth / state.routes.length;
      const cellUnderFinger = Math.floor(
        (dragXRef.current + HIGHLIGHT_SIZE / 2) / itemWidth,
      );
      const target = cancelled
        ? state.index
        : Math.min(state.routes.length - 1, Math.max(0, cellUnderFinger));
      // spring home right away — when the tab changes, the index effect
      // springs to this same resting spot, so both paths settle identically
      Animated.spring(highlightX, {
        ...HIGHLIGHT_SPRING,
        toValue: itemWidth * target + (itemWidth - HIGHLIGHT_SIZE) / 2,
      }).start();
      if (cancelled || target === state.index) return;
      const route = state.routes[target];
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 10 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        // pick the highlight up where it currently is (it may be mid-spring)
        highlightX.stopAnimation((value) => {
          dragXRef.current = value;
        });
      },
      // The drag reads as sliding the page strip, not grabbing the
      // highlight: dragging left pushes the current page away and moves to
      // the NEXT tab, so the highlight — a position indicator — glides
      // opposite the finger, the way a scrollbar mirrors dragged content.
      onPanResponderMove: (_event, gesture) => {
        const { barWidth } = dragContextRef.current;
        if (!barWidth) return;
        highlightX.setValue(
          Math.min(
            barWidth - HIGHLIGHT_SIZE,
            Math.max(0, dragXRef.current - gesture.dx),
          ),
        );
      },
      // recompute from the release position, not the grant position
      onPanResponderRelease: (_event, gesture) => {
        dragXRef.current -= gesture.dx;
        settle(false);
      },
      onPanResponderTerminate: () => settle(true),
    });
  });

  return (
    // full-width anchor that only centers the (width-capped) tab row — taps
    // beside it on wide screens fall through to the content behind it
    <View
      style={[styles.anchor, { bottom: insets.bottom + TAB_BAR_BOTTOM_OFFSET }]}
      pointerEvents="box-none"
    >
    <View
      style={styles.bar}
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
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
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bar: {
    width: "100%",
    maxWidth: TAB_BAR_MAX_WIDTH,
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
