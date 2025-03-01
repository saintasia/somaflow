import { View, ScrollView, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  type?: 'default' | 'scrollable'
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, type = 'default', ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  if (type === 'scrollable') {
    return <ScrollView style={[{ backgroundColor }, style]} {...otherProps} />;
  } else {
    return <View style={[{ backgroundColor }, style]} {...otherProps} />;
  }
}
