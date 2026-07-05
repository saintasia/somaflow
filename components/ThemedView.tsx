import { View, ScrollView, type ScrollViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

// ScrollViewProps (a superset of ViewProps) so the scrollable variant can
// take ScrollView-only props like keyboardShouldPersistTaps; the default
// variant simply ignores any it receives.
export type ThemedViewProps = ScrollViewProps & {
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
