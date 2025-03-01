/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { LightTheme, DarkTheme } from '@/constants/Theme';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: LightTheme.colors.text,
    background: LightTheme.colors.background,
    tint: LightTheme.colors.text,
    icon: LightTheme.colors.text,
    tabIconDefault: LightTheme.colors.primary,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: DarkTheme.colors.text,
    background: DarkTheme.colors.background,
    tint: DarkTheme.colors.text,
    icon: DarkTheme.colors.text,
    tabIconDefault: DarkTheme.colors.primary,
    tabIconSelected: tintColorDark,
  },
};
