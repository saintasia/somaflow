import { Linking } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";
import AboutScreen from "@/app/(tabs)/about";
import { ThemeProvider } from "expo-router/react-navigation";
import { LightTheme } from "@/constants/Theme";

// Mock React Navigation hooks
jest.mock("expo-router/react-navigation", () => ({
  ...jest.requireActual("expo-router/react-navigation"),
  useTheme: () => ({ colors: {} }),
}));

const openURL = jest
  .spyOn(Linking, "openURL")
  .mockResolvedValue(undefined as never);

const renderScreen = () =>
  render(
    <ThemeProvider value={LightTheme}>
      <AboutScreen />
    </ThemeProvider>
  );

test("renders a row for every website link", () => {
  const { getByText } = renderScreen();

  expect(getByText("About SomaFlow")).toBeTruthy();
  expect(getByText("The science")).toBeTruthy();
  expect(getByText("Feedback & help")).toBeTruthy();
  expect(getByText("Privacy")).toBeTruthy();
});

test.each([
  ["About SomaFlow", "https://soma-flow.app/"],
  ["The science", "https://soma-flow.app/research/"],
  ["Feedback & help", "https://soma-flow.app/feedback/"],
  ["Privacy", "https://soma-flow.app/privacy/"],
])("pressing %s opens %s", (label, url) => {
  const { getByText } = renderScreen();

  fireEvent.press(getByText(label));

  expect(openURL).toHaveBeenCalledWith(url);
});
