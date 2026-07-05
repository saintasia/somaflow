// Loaded via "setupFilesAfterEnv" in package.json (jest-expo's preset owns
// "setupFiles", which project config would replace, not merge).
//
// Registers the official AsyncStorage mock for every suite so test files
// don't each hand-roll their own: all methods are jest.fn()s backed by a
// real in-memory store. Assert on calls (expect(AsyncStorage.setItem)...)
// or seed data in a beforeEach with AsyncStorage.clear() + setItem().
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Every screen renders inside GradientBackground (expo-linear-gradient) and
// the breathing screen reads safe-area insets — neither native view works
// under jest, so swap in the inert equivalents both packages recommend.
jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

jest.mock("react-native-safe-area-context", () => {
  const mock = require("react-native-safe-area-context/jest/mock");
  return mock.default ?? mock;
});
