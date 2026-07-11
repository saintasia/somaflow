import { Text, type TextProps, type ColorValue, StyleSheet } from "react-native";
import { LightTheme, DarkTheme, scaleFont } from "@/constants/Theme";
import { useThemeColor } from "@/hooks/useThemeColor";

export type ThemedTextProps = TextProps & {
  lightColor?: ColorValue;
  darkColor?: ColorValue;
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
};

export function ThemedText({
  style,
  lightColor = LightTheme.colors.text,
  darkColor = DarkTheme.colors.text,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

  return (
    <Text
      style={[
        { color },
        type === "default" ? styles.default : undefined,
        type === "title" ? styles.title : undefined,
        type === "defaultSemiBold" ? styles.defaultSemiBold : undefined,
        type === "subtitle" ? styles.subtitle : undefined,
        type === "link" ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: scaleFont(16),
    lineHeight: scaleFont(24),
    fontFamily: "InclusiveSansRegular",
  },
  defaultSemiBold: {
    fontSize: scaleFont(16),
    lineHeight: scaleFont(24),
    fontFamily: "InclusiveSansMedium",
  },
  title: {
    fontSize: scaleFont(32),
    lineHeight: scaleFont(32),
    fontFamily: "InclusiveSansBold",
  },
  subtitle: {
    fontSize: scaleFont(20),
    fontFamily: "InclusiveSansBold",
  },
  link: {
    lineHeight: scaleFont(30),
    fontSize: scaleFont(16),
    fontFamily: "InclusiveSansRegular",
    color: "#0a7ea4",
  },
});
