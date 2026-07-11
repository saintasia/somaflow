import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  STORAGE_KEYS,
  type DarkModeOption,
  loadSettings,
  saveSetting,
} from "@/constants/storage";

// App-wide dark-mode preference ("on"/"off" force a scheme, "auto" follows
// the system). Lives in context so changing it in Settings re-themes every
// mounted screen immediately — useColorScheme() resolves through this.
type ThemeModeContextValue = {
  darkMode: DarkModeOption;
  setDarkMode: (option: DarkModeOption) => void;
};

// The default keeps unprovided trees (tests render screens directly) on the
// follow-the-system behaviour.
const ThemeModeContext = createContext<ThemeModeContextValue>({
  darkMode: "auto",
  setDarkMode: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

// The stored preference + current system scheme → the scheme to render.
// RN 0.86's ColorSchemeName adds "unspecified", which renders as light.
export const resolveColorScheme = (
  system: "light" | "dark" | "unspecified" | null | undefined,
  darkMode: DarkModeOption
): "light" | "dark" => {
  if (darkMode === "on") return "dark";
  if (darkMode === "off") return "light";
  return system === "dark" ? "dark" : "light";
};

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  // null until the stored preference arrives; children are withheld so a
  // forced scheme never flashes the system one on cold start (the splash
  // screen is still up at that point).
  const [darkMode, setDarkModeState] = useState<DarkModeOption | null>(null);

  useEffect(() => {
    loadSettings().then((settings) => {
      setDarkModeState((current) => current ?? settings.darkMode);
    });
  }, []);

  const setDarkMode = (option: DarkModeOption) => {
    setDarkModeState(option);
    saveSetting(STORAGE_KEYS.darkMode, option);
  };

  if (darkMode === null) return null;

  return (
    <ThemeModeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </ThemeModeContext.Provider>
  );
}
