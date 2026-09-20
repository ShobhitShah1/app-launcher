import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface FloatingDockProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function FloatingDock({ state, descriptors, navigation }: FloatingDockProps) {
  return (
    <View style={styles.dockWrapper} pointerEvents="box-none">
      <View style={styles.dockContainer}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const isLauncher = route.name === 'index';
          const iconName = isLauncher
            ? (isFocused ? 'rocket' : 'rocket-outline')
            : (isFocused ? 'flash' : 'flash-outline');
          const label = isLauncher ? 'Launcher' : 'Playground';

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.75}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
            >
              <Ionicons
                name={iconName as any}
                size={18}
                color={isFocused ? '#FFFFFF' : '#737373'}
              />
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <FloatingDock {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Launcher',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Playground',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Platform.OS === 'ios' ? 26 : 16,
  },
  dockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    borderRadius: 30,
    borderWidth: 1.2,
    borderColor: '#262626',
    paddingHorizontal: 6,
    paddingVertical: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 20,
    gap: 6,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  tabItemActive: {
    backgroundColor: '#222222',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#737373',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
