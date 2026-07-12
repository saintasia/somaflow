import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, fireEvent } from "@testing-library/react-native";
import SettingsScreen from "@/app/(tabs)/settings";
import { ThemeProvider } from "expo-router/react-navigation";
import { LightTheme } from "@/constants/Theme"; // Import your custom theme

// (AsyncStorage is mocked globally in jest.setup.js)

// Mock React Navigation hooks
jest.mock("expo-router/react-navigation", () => ({
  ...jest.requireActual("expo-router/react-navigation"),
  useTheme: () => ({ colors: {} }),
}));

test("should save voice guidance when selected", async () => {
  const { getByText } = render(
    <ThemeProvider value={LightTheme}>
      <SettingsScreen />
    </ThemeProvider>
  );

  const maleButton = getByText("Male");
  fireEvent.press(maleButton);

  expect(AsyncStorage.setItem).toHaveBeenCalledWith("voiceGuidance", "male");
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
