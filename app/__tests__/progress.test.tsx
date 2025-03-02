import { render, waitFor} from "@testing-library/react-native";
import ProgressScreen from "@/app/(tabs)/progress";

// mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn((key) => {
    if (key === "breathingHistory") {
      return Promise.resolve(JSON.stringify([{ technique: "Resonant", duration: 5, date: "2024-02-20" }]));
    }
    if (key === "totalSessions") {
      return Promise.resolve("8");
    }
    return Promise.resolve(null);
  }),
}));

// mock theme
jest.mock("@react-navigation/native", () => ({
  useTheme: () => ({ colors: {} }),
}));

test("should display progress history if available", async () => {
  const { getByText } = render(<ProgressScreen />);

  await waitFor(() => {
    expect(getByText(/previous sessions:/i)).toBeTruthy();
    expect(getByText(/February 20, 2024/i)).toBeTruthy();
    expect(getByText(/resonant/i)).toBeTruthy();
    expect(getByText(/5 min/i)).toBeTruthy();
  })
});

test("should display days of the week", async () => {
  const { getByText, getAllByText } = render(<ProgressScreen />);

  await waitFor(() => {
    expect(getByText("M")).toBeTruthy();
    expect(getAllByText("T")).toHaveLength(2)
    expect(getAllByText("S")).toHaveLength(2)
    expect(getByText("W")).toBeTruthy();
    expect(getByText("F")).toBeTruthy();
  });
});

test("should display total sessions", async () => {
  const { getByText } = render(<ProgressScreen />);

  await waitFor(() => {
    expect(getByText(/sessions so far/i)).toBeTruthy();
    expect(getByText(/8/i)).toBeTruthy();
  });
});
