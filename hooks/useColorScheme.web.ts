import { useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";
import { resolveColorScheme, useThemeMode } from "./ThemeModeContext";

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();
  const { darkMode } = useThemeMode();

  // Before hydration the system scheme isn't knowable statically — resolve
  // from "light" exactly as the old hook returned "light".
  return resolveColorScheme(hasHydrated ? colorScheme : "light", darkMode);
}
