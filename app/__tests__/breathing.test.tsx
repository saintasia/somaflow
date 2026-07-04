import { render, fireEvent, waitFor } from "@testing-library/react-native";
import BreathingScreen from "@/app/breathing";
import { Animated } from "react-native";
import * as Haptics from "expo-haptics";

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

// mock haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 0,
    Medium: 1,
    Heavy: 2,
  },
}));

// mock sound
jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
    addListener: jest.fn(),
    remove: jest.fn(),
  })),
}));

// mock icons
jest.mock("@expo/vector-icons", () => ({
  Feather: () => null,
}));

// reset spy call counts (not implementations) so each test's haptics/sound
// assertions start from zero
beforeEach(() => {
  jest.clearAllMocks();
});

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

test("should trigger a haptic cue when a phase starts if enabled", async () => {
  const { getByText } = render(<BreathingScreen />);
  const startButton = getByText(/Start/i);

  fireEvent(startButton, "pressIn");
  // the first pulse of the phase's ripple fires immediately
  await waitFor(() => expect(Haptics.impactAsync).toHaveBeenCalled());
});

