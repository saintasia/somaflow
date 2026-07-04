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
