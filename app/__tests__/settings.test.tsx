import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, fireEvent } from "@testing-library/react-native";
import SettingsScreen from "@/app/(tabs)/settings";
import { ThemeProvider } from "@react-navigation/native";
import { LightTheme } from "@/constants/Theme"; // Import your custom theme

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(() => Promise.resolve(null)),
}));

// Mock React Navigation hooks
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useTheme: () => ({ colors: {} }),
}));

test("should save breathing technique when selected", async () => {
  const { getByText } = render(
    <ThemeProvider value={LightTheme}>
      <SettingsScreen />
    </ThemeProvider>
  );

  const resonantButton = getByText("Resonant");
  fireEvent.press(resonantButton);
  
  expect(AsyncStorage.setItem).toHaveBeenCalledWith("breathingTechnique", "Resonant");
});

test("should save session duration when selected", async () => {
  const { getByText } = render(
    <ThemeProvider value={LightTheme}>
      <SettingsScreen />
    </ThemeProvider>
  );

  const tenMinButton = getByText("10min");
  fireEvent.press(tenMinButton);
  
  expect(AsyncStorage.setItem).toHaveBeenCalledWith("sessionDuration", "10min");
});

test("should save sound setting when toggled", async () => {
  const { getByTestId } = render(
    <ThemeProvider value={LightTheme}>
      <SettingsScreen />
    </ThemeProvider>
  );

  const soundToggle = getByTestId("soundToggle");
  fireEvent.press(soundToggle);
  
  expect(AsyncStorage.setItem).toHaveBeenCalledWith("isSoundEnabled", "false");
});

test("should save vibration setting when toggled", async () => {
  const { getByTestId } = render(
    <ThemeProvider value={LightTheme}>
      <SettingsScreen />
    </ThemeProvider>
  );

  const vibrationToggle = getByTestId("vibrationToggle");
  fireEvent.press(vibrationToggle);
  
  expect(AsyncStorage.setItem).toHaveBeenCalledWith("isVibrationEnabled", "false");
});
