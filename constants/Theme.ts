import { Theme, DarkTheme as DefaultDarkTheme, DefaultTheme } from "@react-navigation/native"; // Import Theme type

export const LightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    background: "#F4FFFF",
    text: "#2C6B80",
    primary: "#5CBEDD",
    border: "#CAE9E9",
    card: "#E8F7F7",
    notification: "#FF0000",
  },
};

export const DarkTheme: Theme = {
  ...DefaultDarkTheme,
  colors: {
    background: "#1A2D34",
    text: "#D2E9F1",
    primary: "#3ea6c7",
    border: "#3A525C",
    card: "#223A44",
    notification: "#FF0000",
  },
};
