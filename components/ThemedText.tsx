import { Text, type TextProps, StyleSheet } from "react-native";
import { LightTheme, DarkTheme } from "@/constants/Theme";
import { useThemeColor } from "@/hooks/useThemeColor";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
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
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "InclusiveSansRegular",
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "InclusiveSansMedium",
  },
  title: {
    fontSize: 32,
    lineHeight: 32,
    fontFamily: "InclusiveSansBold",
  },
  subtitle: {
    fontSize: 20,
    fontFamily: "InclusiveSansBold",
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    fontFamily: "InclusiveSansRegular",
    color: "#0a7ea4",
  },
});
