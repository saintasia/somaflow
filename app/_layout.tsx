import { ThemeProvider } from '@react-navigation/native';
import { LightTheme, DarkTheme, FloatingSurface } from "@/constants/Theme";
import { Stack } from 'expo-router/stack';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemeModeProvider } from '@/hooks/ThemeModeContext';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors'
import { preloadBreathingAudio } from '@/hooks/useBreathingSession';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // the provider must wrap RootNavigator: useColorScheme (called there and in
  // every themed component) resolves the system scheme through the stored
  // dark-mode preference this provider owns
  return (
    <ThemeModeProvider>
      <RootNavigator />
    </ThemeModeProvider>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  // the floating round close chip used by the full-screen breathing session
  // and the technique editor modal
  const headerChip = {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 8,
    // breathing room between the chip and the header title next to it
    marginRight: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: FloatingSurface[colorScheme === 'dark' ? 'dark' : 'light'],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: (colorScheme === 'dark' ? DarkTheme : LightTheme).colors
      .border,
  };


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
                style={headerChip}
              >
                <Feather name="x" size={22} color={colorScheme === 'dark' ?  Colors.dark.text : Colors.light.text} />
              </Pressable>
            ),
          }}
        />
        {/* Create/edit a custom breathing technique (opened from the Breathe
            tab's technique carousel). Same bare header as the breathing
            screen: transparent, no title, floating close chip. */}
        <Stack.Screen
          name="technique-editor"
          options={{
            presentation: 'modal',
            headerTransparent: true,
            headerTitle: 'Your technique',
            headerShadowVisible: false,
            headerLeft: () => (
              <Pressable
                // same onPressIn workaround as the buttons above
                onPressIn={() => router.back()}
                hitSlop={16}
                accessibilityRole="button"
                accessibilityLabel="Go back without saving"
                style={headerChip}
              >
                <Feather name="chevron-left" size={22} color={colorScheme === 'dark' ?  Colors.dark.text : Colors.light.text} />
              </Pressable>
            ),
          }}
        />
        {/* Summary keeps a title + back button, but over the gradient like
            everything else — the default header painted the (translucent)
            card color, which read as a grey band with a shadow */}
        <Stack.Screen
          name="summary"
          options={{
            headerTitle: 'Summary',
            headerTransparent: true,
            headerShadowVisible: false,
            headerLeft: () => (
              <Pressable
                // navigate, not push — see the breathing headerLeft above
                onPressIn={() => router.navigate("/")}
                // same bug as above
                hitSlop={16}
                accessibilityRole="button"
                accessibilityLabel="Go home"
                style={headerChip}
              >
                <Feather name="chevron-left" size={22} color={colorScheme === 'dark' ?  Colors.dark.text : Colors.light.text} />
              </Pressable>
            ),
          }}
        />
      </Stack>
      {/* not "auto" — the status bar must follow the dark-mode setting, which
          may disagree with the system scheme */}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
