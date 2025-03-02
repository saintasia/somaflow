import { render, fireEvent, waitFor } from "@testing-library/react-native";
import BreathingScreen from "@/app/breathing";
import { Vibration } from "react-native";
import {Animated} from "react-native";

// mock storage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(() => Promise.resolve(null)),
}));

// mock animation
jest.spyOn(Animated, "timing").mockImplementation(() => {
  return { 
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn()
  };
});

// mock theme
jest.mock("@react-navigation/native", () => ({
  useTheme: () => ({ colors: {} }),
}));

// mock navigation
jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

// mock haptics and vibration
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 0,
    Medium: 1,
    Heavy: 2,
  },
}));
jest.spyOn(Vibration, "vibrate").mockImplementation(() => {});

// mock sound
jest.mock("expo-av", () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({ sound: { playAsync: jest.fn() } })),
    }
  },
}));

// mock icons
jest.mock("@expo/vector-icons", () => ({
  Feather: () => null,
}));

// mock platform as Android
jest.mock("react-native/Libraries/Utilities/Platform", () => ({
  OS: "android",
  Select: jest.fn(),
}));

test("should start and pause session correctly", async () => {
  const { getByText } = render(<BreathingScreen />);
  const startButton = getByText(/Start/i);

  fireEvent(startButton, "pressIn");
  await waitFor(() =>
    expect(getByText(/Pause/i)).toBeTruthy()
  ); // button should change to "Pause"
  
  fireEvent(startButton, "pressIn");
  await waitFor(() =>
    expect(getByText(/Start/i)).toBeTruthy()
  ); // button should change to "Start"
});

test("should trigger vibration during inhale/exhale if enabled", async () => {
  const { getByText } = render(<BreathingScreen />);
  const startButton = getByText(/Start/i);

  fireEvent(startButton, "pressIn");
  await waitFor(() => expect(Vibration.vibrate).toHaveBeenCalledTimes(1)); // should vibrate on start
});

