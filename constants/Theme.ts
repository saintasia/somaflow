import { Theme, DarkTheme as DefaultDarkTheme, DefaultTheme } from "@react-navigation/native"; // Import Theme type
import { Dimensions } from "react-native";

// Font sizes scale gently with device width: designs are authored against a
// 390pt-wide screen (standard iPhone), and narrower/wider devices shrink or
// grow text proportionally. The factor is clamped so text stays legible on
// small phones and doesn't balloon on tablets or wide web windows. Read once
// at startup — rotation/resize doesn't re-scale, which is fine for "more or
// less" width-proportional type.
const BASE_SCREEN_WIDTH = 390;
const fontScale = Math.min(
  Math.max(Dimensions.get("window").width / BASE_SCREEN_WIDTH, 0.85),
  1.15,
);
// Use for every fontSize/lineHeight (and text-derived minHeights) so type
// tracks the device width consistently app-wide.
export const scaleFont = (size: number) => Math.round(size * fontScale);

export const LightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    background: "#F4FFFF",
    text: "#2C6B80",
    primary: "#5CBEDD",
    border: "#CAE9E9",
    // translucent so cards read as slightly darker than whatever part of the
    // background gradient they sit on (a solid tint would match some stops
    // and clash with others). Don't nest card-on-card — the tints stack.
    card: "rgba(44, 107, 128, 0.10)",
    // subdued rose for destructive actions and error states (delete technique,
    // name-taken) — a pure red fought the calm aqua palette
    notification: "#B85C72",
  },
};

export const DarkTheme: Theme = {
  ...DefaultDarkTheme,
  colors: {
    background: "#1A2D34",
    text: "#D2E9F1",
    primary: "#3ea6c7",
    border: "#3A525C",
    // see the LightTheme card note — darker than any gradient stop
    card: "rgba(8, 18, 24, 0.35)",
    // see the LightTheme notification note — lifted for dark backgrounds
    notification: "#E5A3B3",
  },
};

// Screen backdrop gradients (rendered by components/GradientBackground).
// Stops are tints of each theme's background — light: airy at the top into a
// deeper aqua; dark: deep at the top into a teal lift — chosen so `card` and
// `border` surfaces stay visible against every stop.
export const BackgroundGradients = {
  light: ["#F7FFFF", "#F0FBFB", "#D9F0F3"],
  dark: ["#15242B", "#1A2D34", "#24414D"],
} as const;

// Near-opaque surface for chrome that floats over the gradient (the
// breathing screen's close chip). The theme `card` color is too sheer for
// controls that overlap scrolling content.
export const FloatingSurface = {
  light: "rgba(232, 247, 247, 0.94)",
  dark: "rgba(34, 58, 68, 0.94)",
} as const;

// Muted text — the theme text color at reduced strength, for input
// placeholders and hints. Pre-mixed per scheme because RN color props can't
// carry a separate opacity.
export const MutedText = {
  light: "rgba(44, 107, 128, 0.6)",
  dark: "rgba(210, 233, 241, 0.6)",
} as const;

// Rounded square behind the active tab (icon + label) — the tab bar itself
// is fully transparent over the gradient, so this sliding highlight alone
// marks selection. Light is a soft primary tint; dark deliberately goes
// darker than the gradient (a light tint there glowed instead of settling).
export const ActiveTabHighlight = {
  light: "rgba(92, 190, 221, 0.28)",
  dark: "rgba(8, 18, 24, 0.45)",
} as const;

// Metrics of the floating (transparent) tab bar ((tabs)/_layout.tsx). Tab
// screens with bottom-anchored or scrolling content pad their bottom edge by
// FLOATING_TAB_CLEARANCE + the safe-area bottom inset so nothing sits
// behind the tab icons.
export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_BOTTOM_OFFSET = 12;
export const FLOATING_TAB_CLEARANCE =
  TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 12;
