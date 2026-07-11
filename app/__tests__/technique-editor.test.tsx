import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import TechniqueEditorScreen from "@/app/technique-editor";

// (AsyncStorage is mocked globally in jest.setup.js)

// mock theme
jest.mock("expo-router/react-navigation", () => ({
  useTheme: () => ({ colors: {} }),
}));

// mock navigation: back/navigate are asserted on, params are mutated per test
// to enter edit mode (all exposed on the mock module because factories are hoisted)
jest.mock("expo-router", () => {
  const back = jest.fn();
  const navigate = jest.fn();
  const params: { name?: string } = {};
  return {
    useRouter: () => ({ back, navigate }),
    useLocalSearchParams: () => params,
    __back: back,
    __navigate: navigate,
    __params: params,
  };
});
const {
  __back: mockBack,
  __navigate: mockNavigate,
  __params: mockParams,
} = jest.requireMock("expo-router");

// mock icons
jest.mock("@expo/vector-icons", () => ({
  Feather: () => null,
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  delete mockParams.name;
});

test("creates a technique, selects it and closes", async () => {
  const { getByLabelText, getByText } = render(<TechniqueEditorScreen />);

  fireEvent.changeText(getByLabelText("Technique name"), "Calm");
  // default inhale is 4s; one bump makes the pattern distinct
  fireEvent.press(getByLabelText("Increase Breathe in"));
  expect(getByText("5s")).toBeTruthy();

  fireEvent.press(getByText("Save technique"));

  await waitFor(() => {
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "customTechniques",
      expect.stringContaining('"Calm"')
    );
    // saving also selects the new technique for the Breathe tab
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "breathingTechnique",
      "Calm"
    );
    expect(mockBack).toHaveBeenCalled();
  });
});

test("rejects a name that clashes with an existing technique", async () => {
  const { getByLabelText, getByText } = render(<TechniqueEditorScreen />);

  fireEvent.changeText(getByLabelText("Technique name"), "Resonant");
  expect(
    getByText(/a technique with this name already exists/i)
  ).toBeTruthy();

  fireEvent.press(getByText("Save technique"));

  expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
    "customTechniques",
    expect.anything()
  );
  expect(mockBack).not.toHaveBeenCalled();
});

test("prefills an existing custom technique in edit mode", async () => {
  await AsyncStorage.setItem(
    "customTechniques",
    JSON.stringify({
      "My Flow": {
        description: "Slow evenings",
        pattern: { inhale: 5, hold: 2, exhale: 7, hold2: 0 },
      },
    })
  );
  mockParams.name = "My Flow";

  const { getByDisplayValue, getByLabelText } = render(
    <TechniqueEditorScreen />
  );

  await waitFor(() => {
    expect(getByDisplayValue("My Flow")).toBeTruthy();
    expect(getByDisplayValue("Slow evenings")).toBeTruthy();
  });
  expect(getByLabelText("Delete My Flow")).toBeTruthy();
});

test("deletes a custom technique after confirmation and resets the selection", async () => {
  await AsyncStorage.setItem(
    "customTechniques",
    JSON.stringify({
      "My Flow": {
        description: "",
        pattern: { inhale: 5, hold: 2, exhale: 7, hold2: 0 },
      },
    })
  );
  await AsyncStorage.setItem("breathingTechnique", "My Flow");
  mockParams.name = "My Flow";
  const alertSpy = jest.spyOn(Alert, "alert");

  const { getByDisplayValue, getByLabelText } = render(
    <TechniqueEditorScreen />
  );
  await waitFor(() => expect(getByDisplayValue("My Flow")).toBeTruthy());

  fireEvent.press(getByLabelText("Delete My Flow"));

  // confirm via the alert's destructive button
  const buttons = alertSpy.mock.calls[0][2];
  buttons?.find((button) => button.style === "destructive")?.onPress?.();

  await waitFor(() => {
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("customTechniques", "{}");
    // the deleted technique was selected — selection falls back to the default
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "breathingTechnique",
      "Resonant"
    );
    // deleting goes home (the editor may sit over a running session whose
    // technique no longer exists), rather than just dismissing the modal
    expect(mockNavigate).toHaveBeenCalledWith("/");
    expect(mockBack).not.toHaveBeenCalled();
  });
});
