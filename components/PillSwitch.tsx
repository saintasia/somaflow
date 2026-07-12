import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { Pill } from "@/constants/Theme";

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 30;
const THUMB_SIZE = 24;
const TRACK_PADDING = (TRACK_HEIGHT - THUMB_SIZE) / 2;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - TRACK_PADDING * 2;

// The app's on/off toggle: a pill track with a sliding thumb, used instead
// of the native Switch so the control looks the same on iOS, Android, and
// web and sits in the app's palette. Styled by the scheme-invariant Pill
// palette, like the settings segments. State is conveyed by the thumb's
// position (not colour alone) and exposed to screen readers as a real
// switch.
export function PillSwitch({
  value,
  onValueChange,
  accessibilityLabel,
  testID,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  testID?: string;
}) {
  // lazy useState (not useRef(...).current): a stable instance without
  // reading a ref during render, which react-hooks/refs forbids
  const [position] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(position, {
      toValue: value ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [value, position]);

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      testID={testID}
      style={[
        styles.track,
        { backgroundColor: value ? Pill.activeFill : Pill.switchOffTrack },
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            transform: [
              {
                translateX: position.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, THUMB_TRAVEL],
                }),
              },
            ],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: "center",
    paddingHorizontal: TRACK_PADDING,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "white",
  },
});
