import { useTheme } from "expo-router/react-navigation";
import type { AppTheme } from "@/constants/Theme";

// useTheme() returns the base navigation Theme, but the provider is always
// given LightTheme/DarkTheme (constants/Theme.ts), which carry the app's
// extra colour tokens (iconAccent, inactivePill, …). This is the one place
// that widens the type — screens use this instead of useTheme so every
// colour, built-in or custom, resolves the same way.
export function useAppTheme(): AppTheme {
  return useTheme() as AppTheme;
}
