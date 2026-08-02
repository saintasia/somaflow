import { Tabs } from 'expo-router';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { FloatingTabBar } from '@/components/FloatingTabBar';

export default function TabLayout() {
  return (
    <Tabs
      // transparent floating bar with a sliding active-tab highlight — all
      // the bar's look and positioning lives in FloatingTabBar
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false, // no top bar on pages with footer nav
        // switching tabs shifts the screens slightly in the travel
        // direction — the same page metaphor as the tab bar's drag gesture
        // and the Breathe tab's carousels (tabs otherwise swap with no
        // animation at all, which reads especially abrupt on Android)
        animation: 'shift',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Breathe',
          tabBarIcon: ({ color, size }) => <Feather name="wind" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: ({ color, size }) => <Feather name="info" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
