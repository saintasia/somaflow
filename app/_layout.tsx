import { ThemeProvider } from '@react-navigation/native';
import { LightTheme, DarkTheme } from "@/constants/Theme";
import { Stack } from 'expo-router/stack';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Feather } from '@expo/vector-icons';
import { Pressable, TouchableOpacity } from 'react-native';
import { useNavigation } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const navigation = useNavigation();

  const [loaded] = useFonts({
    InclusiveSansMedium: require('../assets/fonts/InclusiveSans-Medium.ttf'),
    InclusiveSansRegular: require('../assets/fonts/InclusiveSans-Regular.ttf'),
    InclusiveSansBold: require('../assets/fonts/InclusiveSans-Bold.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : LightTheme}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTitleStyle: { fontSize: 18, fontFamily: 'InclusiveSansMedium' },
        }}
      >
        {/* Home, Summary and Settings - Uses Bottom Tabs */}
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
          />
        {/* Breathing Screen - Uses Stack */}
        <Stack.Screen
          name="breathing"
          options={{
            headerTitle: 'Breathing',
            headerLeft: () => (
              <Pressable
                onPressIn={() => router.push("/")}
                // bug in React native doesn't allow onPress to work: https://github.com/expo/expo/issues/33093
                style={{ marginRight: 14 }}
                hitSlop={40}
              >
                <Feather name="chevron-left" size={40} color={colorScheme === 'dark' ? '#fff' : '#356e80'} />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="summary"
          options={{
            headerTitle: 'Summary',
            headerBackTitle: "Home",
            headerLeft: () => (
              <Pressable
                onPressIn={() => router.push("/")}
                // same bug as above
                style={{ marginRight: 14 }}
              >
                <Feather name="chevron-left" size={26} color={colorScheme === 'dark' ? '#fff' : '#356e80'} />
              </Pressable>
            ),
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
