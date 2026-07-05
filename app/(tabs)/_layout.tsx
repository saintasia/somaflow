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
    </Tabs>
  );
}
