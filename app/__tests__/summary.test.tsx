import { render, waitFor } from "@testing-library/react-native";
import SummaryScreen from "@/app/summary";

// mock navigation
jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

// mock theme
jest.mock("@react-navigation/native", () => ({
  useTheme: () => ({ colors: {} }),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn((key) => {
    if (key === "breathingHistory") {
      return Promise.resolve(JSON.stringify([{ technique: "Resonant", duration: 5, day: "Monday" }]));
    }
    if (key === "totalSessions") {
      return Promise.resolve("8");
    }
    return Promise.resolve(null);
  }),
}));

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
