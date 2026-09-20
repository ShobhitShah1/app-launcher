import { NativeModules, Platform } from 'react-native';

const { DeviceIconModule } = NativeModules;

export interface DeviceIconServiceType {
  isPinShortcutSupported: () => Promise<boolean>;
  pinShortcutToDevice: (
    packageName: string,
    label: string,
    iconUri?: string
  ) => Promise<{ success: boolean; message?: string }>;
  changeAppDeviceIcon: (
    aliasKey: 'default' | 'globe' | 'chat' | 'music' | 'camera' | 'cube'
  ) => Promise<{ success: boolean; message?: string }>;
}

export const DeviceIconService: DeviceIconServiceType = {
  async isPinShortcutSupported(): Promise<boolean> {
    if (Platform.OS === 'android' && DeviceIconModule?.isPinShortcutSupported) {
      try {
        return await DeviceIconModule.isPinShortcutSupported();
      } catch (e) {
        return false;
      }
    }
    return false;
  },

  async pinShortcutToDevice(
    packageName: string,
    label: string,
    iconUri?: string
  ): Promise<{ success: boolean; message?: string }> {
    if (Platform.OS === 'android' && DeviceIconModule?.pinShortcut) {
      try {
        const res = await DeviceIconModule.pinShortcut(packageName, label, iconUri || '');
        return {
          success: true,
          message: 'Shortcut with custom icon created on your device home screen!',
        };
      } catch (err: any) {
        console.warn('pinShortcut error:', err);
        return {
          success: false,
          message: err?.message || 'Failed to pin shortcut to device.',
        };
      }
    }

    return {
      success: true,
      message: `[Preview] Pinned "${label}" shortcut to device home screen.`,
    };
  },

  async changeAppDeviceIcon(
    aliasKey: 'default' | 'globe' | 'chat' | 'music' | 'camera' | 'cube'
  ): Promise<{ success: boolean; message?: string }> {
    if (Platform.OS === 'android' && DeviceIconModule?.changeAppIcon) {
      try {
        await DeviceIconModule.changeAppIcon(aliasKey);
        return {
          success: true,
          message: `App device launcher icon changed to ${aliasKey.toUpperCase()}!`,
        };
      } catch (err: any) {
        console.warn('changeAppIcon error:', err);
        return {
          success: false,
          message: err?.message || 'Failed to change app device icon.',
        };
      }
    }

    return {
      success: true,
      message: `[Preview] App device icon updated to "${aliasKey}".`,
    };
  },
};
