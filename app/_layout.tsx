import { ThemeProvider } from '@react-navigation/native';
import { LightTheme, DarkTheme, FloatingSurface } from "@/constants/Theme";
import { Stack } from 'expo-router/stack';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors'
import { preloadBreathingAudio } from '@/hooks/useBreathingSession';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();


  const [loaded] = useFonts({
    InclusiveSansMedium: require('../assets/fonts/InclusiveSans-Medium.ttf'),
    InclusiveSansRegular: require('../assets/fonts/InclusiveSans-Regular.ttf'),
    InclusiveSansBold: require('../assets/fonts/InclusiveSans-Bold.ttf'),
  });

  // download the breathing audio and create its players now, so they're ready
  // well before the first session's Start press (see preloadBreathingAudio)
  useEffect(() => {
    preloadBreathingAudio();
  }, []);

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
        {/* Breathing Screen - Uses Stack. The session visuals own the whole
            screen: no bar, no title, no shadow — just a floating close chip
            over the gradient. */}
        <Stack.Screen
          name="breathing"
          options={{
            headerTransparent: true,
            headerShadowVisible: false,
            headerTitle: '',
            headerLeft: () => (
              <Pressable
                // back() pops this screen, guaranteeing it unmounts and its
                // preloaded audio players are released. navigate("/") could
                // leave this screen mounted with its session still playing
                // behind the tabs, and push stacked a new home on top,
                // leaking 10 native players per abandoned breathing screen.
                onPressIn={() =>
                  router.canGoBack() ? router.back() : router.navigate("/")
                }
                // bug in React native doesn't allow onPress to work: https://github.com/expo/expo/issues/33093
                hitSlop={16}
                accessibilityRole="button"
                accessibilityLabel="End session and go back"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  marginLeft: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    FloatingSurface[colorScheme === 'dark' ? 'dark' : 'light'],
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: (colorScheme === 'dark' ? DarkTheme : LightTheme)
                    .colors.border,
                }}
              >
                <Feather name="x" size={22} color={colorScheme === 'dark' ?  Colors.dark.text : Colors.light.text} />
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
                // navigate, not push — see the breathing headerLeft above
                onPressIn={() => router.navigate("/")}
                // same bug as above
                style={{ marginRight: 14 }}
              >
                <Feather name="chevron-left" size={40} color={colorScheme === 'dark' ?  Colors.dark.text : Colors.light.text} />
              </Pressable>
            ),
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
