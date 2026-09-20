import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export interface EventMessage {
  id: string;
  type: 'install' | 'remove' | 'info' | 'success' | 'warning';
  title: string;
  subtitle?: string;
}

interface Props {
  event: EventMessage | null;
  onDismiss: () => void;
}

export function EventBanner({ event, onDismiss }: Props) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (event) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss();
        });
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [event]);

  if (!event) return null;

  const getBadgeTag = () => {
    switch (event.type) {
      case 'install':
        return 'INSTALL';
      case 'remove':
        return 'REMOVE';
      case 'success':
        return 'SUCCESS';
      case 'warning':
        return 'NOTICE';
      default:
        return 'STATUS';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{getBadgeTag()}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{event.title}</Text>
        {event.subtitle ? (
          <Text style={styles.subtitle}>{event.subtitle}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    backgroundColor: '#121212',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  badge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 12,
  },
  badgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  subtitle: {
    color: '#A3A3A3',
    fontSize: 12,
    marginTop: 2,
  },
});
