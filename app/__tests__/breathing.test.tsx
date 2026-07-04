import { render, fireEvent, waitFor } from "@testing-library/react-native";
import BreathingScreen from "@/app/breathing";
import { Animated, Platform, Vibration } from "react-native";
import * as Haptics from "expo-haptics";

// (AsyncStorage is mocked globally in jest.setup.js)

// mock animation
jest.spyOn(Animated, "timing").mockImplementation(() => {
  return { 
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn()
  };
});

// mock theme + focus (useFocusEffect is a no-op: focus/blur isn't simulated)
jest.mock("@react-navigation/native", () => ({
  useTheme: () => ({ colors: {} }),
  useFocusEffect: jest.fn(),
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

test("keeps Android vibration patterns above the 1s silent-drop threshold", async () => {
  // Android 13+ silently drops attribute-less vibration patterns totalling
  // <= 1000ms on phones with "Touch feedback" off (see HAPTIC_BUCKET_PAD_MS
  // in useBreathingSession) — this test trips if the pad is ever removed.
  Platform.OS = "android";
  const vibrateSpy = jest.spyOn(Vibration, "vibrate");
  try {
    const { getByText } = render(<BreathingScreen />);
    fireEvent(getByText(/Start/i), "pressIn");

    await waitFor(() => expect(vibrateSpy).toHaveBeenCalled());
    const pattern = vibrateSpy.mock.calls[0][0] as number[];
    expect(pattern.reduce((total, ms) => total + ms, 0)).toBeGreaterThan(1000);
  } finally {
    Platform.OS = "ios";
    vibrateSpy.mockRestore();
  }
});

