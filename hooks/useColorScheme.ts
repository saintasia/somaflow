import { useColorScheme as useSystemColorScheme } from "react-native";
import { resolveColorScheme, useThemeMode } from "./ThemeModeContext";

// The system scheme filtered through the user's dark-mode setting.
export function useColorScheme() {
  const system = useSystemColorScheme();
  const { darkMode } = useThemeMode();
  return resolveColorScheme(system, darkMode);
}
