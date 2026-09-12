// App.js
import React from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import ChatScreen from './screens/ChatScreen';
import GamesScreen from './screens/GamesScreen';
import SettingsScreen from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();

// A calmer, more modern dark palette with a violet accent, tuned so
// translucent "glass" surfaces (BlurView) always have something moody
// behind them to blur.
export const THEME = {
  primary: '#9D7CFF',
  primaryDark: '#7C5CE0',
  accentGlow: 'rgba(157, 124, 255, 0.35)',
  background: '#0B0A10',
  gradientTop: '#171226',
  gradientBottom: '#0B0A10',
  glass: 'rgba(255,255,255,0.06)',
  glassStrong: 'rgba(255,255,255,0.10)',
  glassBorder: 'rgba(255,255,255,0.14)',
  text: '#F3F1FA',
  textMuted: '#A79EC2',
  inactive: '#6E637F',
  success: '#7EE0A8',
  danger: '#F0A090',
};

const NavDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
    card: 'transparent',
    text: THEME.text,
    border: THEME.glassBorder,
    primary: THEME.primary,
  },
};

function AppBackground() {
  return (
    <LinearGradient
      colors={[THEME.gradientTop, THEME.background]}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}

function GlassTabBarBackground() {
  return (
    <BlurView
      intensity={40}
      tint="dark"
      style={[StyleSheet.absoluteFill, styles.tabBarBlur]}
    />
  );
}

export default function App() {
  return (
    <>
      <AppBackground />
      <NavigationContainer theme={NavDarkTheme}>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            sceneStyle: { backgroundColor: 'transparent' },
            tabBarStyle: styles.tabBar,
            tabBarBackground: () => <GlassTabBarBackground />,
            tabBarActiveTintColor: THEME.primary,
            tabBarInactiveTintColor: THEME.inactive,
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            tabBarIcon: ({ color, size, focused }) => {
              let iconName;
              if (route.name === 'Chat Tutor') {
                iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
              } else if (route.name === 'Games') {
                iconName = focused ? 'game-controller' : 'game-controller-outline';
              } else if (route.name === 'Settings') {
                iconName = focused ? 'settings' : 'settings-outline';
              }
              return <Ionicons name={iconName} size={size - 2} color={color} />;
            },
          })}
        >
          <Tab.Screen
            name="Chat Tutor"
            component={ChatScreen}
            options={{ title: 'El Calvito de Open' }}
          />
          <Tab.Screen name="Games" component={GamesScreen} options={{ title: 'Mini-Games' }} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    height: 68,
    borderRadius: 28,
    borderTopWidth: 0,
    paddingTop: 10,
    backgroundColor: 'transparent',
    elevation: 0,
    overflow: 'hidden',
  },
  tabBarBlur: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    overflow: 'hidden',
  },
});
