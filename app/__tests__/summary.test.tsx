import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, waitFor } from "@testing-library/react-native";
import SummaryScreen from "@/app/summary";

// mock navigation
jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

// mock theme
jest.mock("expo-router/react-navigation", () => ({
  useTheme: () => ({ colors: {} }),
}));

// seed the global AsyncStorage mock (jest.setup.js) with a finished session
beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(
    "breathingHistory",
    JSON.stringify([{ technique: "Resonant", duration: 5, day: "Monday" }])
  );
  await AsyncStorage.setItem("totalSessions", "8");
});

test("should display completed session details", async () => {
  const { getByText } = render(<SummaryScreen />);
  await waitFor(() => {
    expect(getByText(/completed the/i)).toBeTruthy();
    expect(getByText(/resonant/i)).toBeTruthy();
    expect(getByText(/5 min session/i)).toBeTruthy();
  });
});

test("should display total sessions", async () => {
  const { getByText } = render(<SummaryScreen />);
  await waitFor(() => {
    expect(getByText(/Sessions so far/i)).toBeTruthy();
    expect(getByText(/8/i)).toBeTruthy();
  });
});
