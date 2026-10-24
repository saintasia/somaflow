import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { Feather as VectorFeather } from "@expo/vector-icons";

type VectorFeatherProps = ComponentProps<typeof VectorFeather>;
type FeatherProps = Omit<VectorFeatherProps, "color"> & {
  color?: ColorValue;
};

// @expo/vector-icons' Feather, accepting the theme's ColorValue for `color`.
// Since RN 0.88 ColorValue also admits null and processed (number) colors,
// which the icon set's `string | OpaqueColorValue` prop rejects — and the
// navigation theme and `tabBarIcon` hand out ColorValue, so every themed
// icon hit it. The icon renders `color` through a Text style, which takes
// any ColorValue, so the cast only papers over the narrower typing. Import
// icons from here, not from @expo/vector-icons directly.
export function Feather({ color, ...props }: FeatherProps) {
  return (
    <VectorFeather
      {...props}
      color={(color ?? undefined) as VectorFeatherProps["color"]}
    />
  );
}
