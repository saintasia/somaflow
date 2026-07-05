import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import HomeScreen from "@/app/(tabs)/index";

// (AsyncStorage is mocked globally in jest.setup.js)

// mock theme + focus. useFocusEffect runs its callback on mount (like a
// freshly focused screen) so the saved-settings reload path is exercised.
jest.mock("@react-navigation/native", () => ({
  useTheme: () => ({ colors: {} }),
  useFocusEffect: (callback: () => void) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports
    require("react").useEffect(callback, [callback]),
}));

// mock navigation
jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

// mock the Lottie previews (a plain function component ignores the ref, so
// VisualizationPreview's imperative play() calls are safely skipped)
jest.mock("lottie-react-native", () => () => null);

// mock icons
jest.mock("@expo/vector-icons", () => ({
  Feather: () => null,
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

test("restores the saved choices when the tab gains focus", async () => {
  await AsyncStorage.setItem("breathingTechnique", "Box Breathing");
  await AsyncStorage.setItem("sessionDuration", "12min");
  await AsyncStorage.setItem("breathingVisualization", "mandala");

  const { getByText } = render(<HomeScreen />);

  await waitFor(() => {
    expect(getByText("12 min")).toBeTruthy();
    expect(getByText(/enhance focus/i)).toBeTruthy(); // Box Breathing's description
  });
});

test("selects a visualization from its dot and saves it", () => {
  const { getByLabelText } = render(<HomeScreen />);

  fireEvent.press(getByLabelText("Select Mandala"));

  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    "breathingVisualization",
    "mandala"
  );
});

test("steps to the next technique with the chevron and saves it", () => {
  const { getByLabelText } = render(<HomeScreen />);

  fireEvent.press(getByLabelText("Next technique"));

  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    "breathingTechnique",
    "4-7-8"
  );
});

test("does not step back past the first technique", () => {
  const { getByLabelText } = render(<HomeScreen />);

  // default selection is Resonant, the first technique
  fireEvent.press(getByLabelText("Previous technique"));

  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test("increases session length by one minute and saves it", () => {
  const { getByLabelText, getByText } = render(<HomeScreen />);

  fireEvent.press(getByLabelText("Increase session length"));

  expect(getByText("6 min")).toBeTruthy();
  expect(AsyncStorage.setItem).toHaveBeenCalledWith("sessionDuration", "6min");
});

test("decreases session length by one minute and saves it", () => {
  const { getByLabelText } = render(<HomeScreen />);

  fireEvent.press(getByLabelText("Decrease session length"));

  // the minutes are a windowed FlatList and jest fires no layout/scroll
  // events, so pages below the initial "5 min" window never render — assert
  // the save instead of the page text
  expect(AsyncStorage.setItem).toHaveBeenCalledWith("sessionDuration", "4min");
});

test("does not decrease session length below the minimum", () => {
  const { getByLabelText } = render(<HomeScreen />);
  const decrease = getByLabelText("Decrease session length");

  // default is 5 min; six presses pass the 1 min floor
  for (let i = 0; i < 6; i++) {
    fireEvent.press(decrease);
  }

  // the saves stop at the floor ("1 min" page text isn't rendered — see the
  // windowing note in the decrease test above)
  const durationSaves = (AsyncStorage.setItem as jest.Mock).mock.calls.filter(
    ([key]) => key === "sessionDuration"
  );
  expect(durationSaves[durationSaves.length - 1]).toEqual([
    "sessionDuration",
    "1min",
  ]);
  expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
    "sessionDuration",
    "0min"
  );
});
