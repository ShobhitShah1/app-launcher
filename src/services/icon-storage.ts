import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@appicon/custom_app_icons_v1';

export interface PresetIcon {
  id: string;
  name: string;
  source: any;
}

export const PRESET_ICONS: PresetIcon[] = [
  {
    id: 'cyber-globe',
    name: 'Cyber Globe',
    source: require('@/assets/images/presets/cyber-globe.png'),
  },
  {
    id: 'neon-chat',
    name: 'Neon Chat',
    source: require('@/assets/images/presets/neon-chat.png'),
  },
  {
    id: 'music-waves',
    name: 'Music Waves',
    source: require('@/assets/images/presets/music-waves.png'),
  },
  {
    id: 'camera-lens',
    name: 'Camera Lens',
    source: require('@/assets/images/presets/camera-lens.png'),
  },
  {
    id: 'neon-cube',
    name: 'Neon Cube',
    source: require('@/assets/images/presets/neon-cube.png'),
  },
  {
    id: 'neon-rocket',
    name: 'Neon Rocket',
    source: require('@/assets/images/presets/neon-rocket.png'),
  },
];

export async function getCustomIcons(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load custom icons from storage:', error);
    return {};
  }
}

export async function setCustomIcon(
  packageName: string,
  iconUri: string
): Promise<void> {
  try {
    const current = await getCustomIcons();
    current[packageName] = iconUri;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (error) {
    console.error(`Failed to save custom icon for ${packageName}:`, error);
  }
}

export async function removeCustomIcon(packageName: string): Promise<void> {
  try {
    const current = await getCustomIcons();
    if (current[packageName]) {
      delete current[packageName];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }
  } catch (error) {
    console.error(`Failed to remove custom icon for ${packageName}:`, error);
  }
}

export async function clearAllCustomIcons(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear custom icons:', error);
  }
}
