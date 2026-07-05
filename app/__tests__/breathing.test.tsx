import AsyncStorage from "@react-native-async-storage/async-storage";
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

// mock the asset pre-download that runs before players are created
jest.mock("expo-asset", () => ({
  Asset: { loadAsync: jest.fn(() => Promise.resolve([])) },
}));

// mock sound, keeping every created player reachable via __players: the hook
// caches its players in a module-level singleton, so instances from the first
// render outlive jest.clearAllMocks and later tests still need to reach them
jest.mock("expo-audio", () => {
  const __players: { play: jest.Mock; playing: boolean }[] = [];
  return {
    __players,
    createAudioPlayer: jest.fn(() => {
      // playing is stateful (play/pause flip it) so the hook's
      // pause-freezes-clips logic can tell which players were mid-clip
      const player = {
        play: jest.fn(() => {
          player.playing = true;
        }),
        pause: jest.fn(() => {
          player.playing = false;
        }),
        seekTo: jest.fn(),
        addListener: jest.fn(),
        remove: jest.fn(),
        volume: 1,
        isLoaded: true,
        playing: false,
        currentTime: 0,
      };
      __players.push(player);
      return player;
    }),
  };
});

// mock icons
jest.mock("@expo/vector-icons", () => ({
  Feather: () => null,
}));

// reset spy call counts (not implementations) so each test's haptics/sound
// assertions start from zero, and clear any storage seeded by a prior test
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  // the player singleton outlives each test — reset the stateful bit
  jest
    .requireMock("expo-audio")
    .__players.forEach((p: { playing: boolean }) => {
      p.playing = false;
    });
});

// Which players started this test, by creation index. getPlayers() creates
// them in a fixed order — 4 music players (in-4, out-4, out-6, out-8) then 6
// voice players (female in/out/hold, male in/out/hold) — so the index tells
// the layers apart: 0-3 music, 4-9 voice.
const startedPlayers = () => {
  const { __players } = jest.requireMock("expo-audio");
  return __players
    .map((p: { play: jest.Mock }, index: number) =>
      p.play.mock.calls.length ? index : -1
    )
    .filter((index: number) => index >= 0);
};

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

test("voice guidance still plays when background sound is off", async () => {
  // the two audio layers are independent: turning off "Background sound"
  // (music) must not silence the spoken cues
  await AsyncStorage.setItem("isSoundEnabled", "false");
  await AsyncStorage.setItem("voiceGuidance", "female");
  await AsyncStorage.setItem("sessionDuration", "7min");

  const { getByText } = render(<BreathingScreen />);
  // the seeded settings are applied once the duration renders
  await waitFor(() => expect(getByText(/7 min session/i)).toBeTruthy());

  fireEvent(getByText(/Start/i), "pressIn");

  // only the female "breathe in" voice cue starts — no music player
  await waitFor(() => expect(startedPlayers()).toEqual([4]));
});

test("music still plays when voice guidance is off", async () => {
  await AsyncStorage.setItem("isSoundEnabled", "true");
  await AsyncStorage.setItem("voiceGuidance", "off");
  await AsyncStorage.setItem("sessionDuration", "7min");

  const { getByText } = render(<BreathingScreen />);
  await waitFor(() => expect(getByText(/7 min session/i)).toBeTruthy());

  fireEvent(getByText(/Start/i), "pressIn");

  // only the 4s "breathe in" music swell starts — no voice player
  await waitFor(() => expect(startedPlayers()).toEqual([0]));
});

test("plays nothing when background sound and voice are both off", async () => {
  await AsyncStorage.setItem("isSoundEnabled", "false");
  await AsyncStorage.setItem("voiceGuidance", "off");
  await AsyncStorage.setItem("sessionDuration", "7min");

  const { getByText } = render(<BreathingScreen />);
  await waitFor(() => expect(getByText(/7 min session/i)).toBeTruthy());

  fireEvent(getByText(/Start/i), "pressIn");

  // the phase has started once its haptic cue fires — no player may start
  await waitFor(() => expect(Haptics.impactAsync).toHaveBeenCalled());
  expect(startedPlayers()).toEqual([]);
});

test("pause freezes clips in place and Continue resumes them", async () => {
  await AsyncStorage.setItem("sessionDuration", "7min");

  const { getByText } = render(<BreathingScreen />);
  await waitFor(() => expect(getByText(/7 min session/i)).toBeTruthy());

  // start: default settings play the phase's music (0) and voice cue (4)
  fireEvent(getByText(/Start/i), "pressIn");
  await waitFor(() => expect(startedPlayers()).toEqual([0, 4]));
  const music = jest.requireMock("expo-audio").__players[0];

  // let the countdown tick once (the button only reads Continue after
  // elapsedTime > 0), then pause mid-clip: frozen where it is, NOT rewound
  await waitFor(() => expect(getByText("3")).toBeTruthy(), { timeout: 3000 });
  fireEvent(getByText(/Pause/i), "pressIn");
  await waitFor(() => expect(getByText(/Continue/i)).toBeTruthy());
  expect(music.pause).toHaveBeenCalled();
  expect(music.seekTo).not.toHaveBeenCalled();

  // continue: the frozen clip picks back up (second play call)
  fireEvent(getByText(/Continue/i), "pressIn");
  await waitFor(() => expect(music.play.mock.calls.length).toBe(2));
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

