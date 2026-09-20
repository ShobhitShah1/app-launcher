import { Platform, NativeModules } from 'react-native';
import {
  InstalledApps,
  RNLauncherKitHelper,
  IntentAction,
  MimeType,
} from 'react-native-launcher-kit';
import { DeviceIconService } from './device-icon';

export interface AppDetail {
  label: string;
  packageName: string;
  icon: string;
  version?: string;
  accentColor?: string;
}

export interface GetAppsOptions {
  includeVersion: boolean;
  includeAccentColor: boolean;
}

export interface BatteryStatus {
  level: number;
  isCharging: boolean;
}

export interface LaunchParams {
  action?: string;
  data?: string;
  type?: string;
  extras?: Record<string, string>;
  category?: string;
}

export { IntentAction, MimeType };

export const isAndroid = Platform.OS === 'android';

// Check if LauncherKit native module is linked into the current runtime
export const isNativeLauncherKitAvailable = (): boolean => {
  if (!isAndroid) return false;
  return Boolean(
    (globalThis as any).__turboModuleProxy?.('RNLauncherKitSpec') ||
      NativeModules?.LauncherKit
  );
};

// Rich simulated apps for preview / Expo Go environments
const MOCK_APPS: AppDetail[] = [
  {
    label: 'Chrome Browser',
    packageName: 'com.android.chrome',
    icon: '',
    version: '124.0.6367.82',
    accentColor: '#737373',
  },
  {
    label: 'YouTube',
    packageName: 'com.google.android.youtube',
    icon: '',
    version: '19.16.39',
    accentColor: '#EF4444',
  },
  {
    label: 'Camera',
    packageName: 'com.google.android.GoogleCamera',
    icon: '',
    version: '9.2.113',
    accentColor: '#F59E0B',
  },
  {
    label: 'Messages',
    packageName: 'com.google.android.apps.messaging',
    icon: '',
    version: '20240416',
    accentColor: '#A855F7',
  },
  {
    label: 'Music Player',
    packageName: 'com.spotify.music',
    icon: '',
    version: '8.9.28.591',
    accentColor: '#10B981',
  },
  {
    label: 'System Settings',
    packageName: 'com.android.settings',
    icon: '',
    version: '14.0',
    accentColor: '#06B6D4',
  },
  {
    label: 'Clock & Alarm',
    packageName: 'com.google.android.deskclock',
    icon: '',
    version: '7.6',
    accentColor: '#EC4899',
  },
  {
    label: 'WhatsApp',
    packageName: 'com.whatsapp',
    icon: '',
    version: '2.24.9',
    accentColor: '#22C55E',
  },
];

let mockBattery: BatteryStatus = {
  level: 88,
  isCharging: false,
};

let batteryListeners: ((status: BatteryStatus) => void)[] = [];
let installListeners: ((app: AppDetail) => void)[] = [];
let removalListeners: ((packageName: string) => void)[] = [];

export const LauncherKitService = {
  isAndroid,
  isNativeModuleAvailable: isNativeLauncherKitAvailable,

  async getApps(options?: GetAppsOptions): Promise<AppDetail[]> {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        const apps = await InstalledApps.getApps(options);
        if (Array.isArray(apps) && apps.length > 0) {
          return apps;
        }
      } catch (err) {
        console.warn('getApps primary error, retrying without accent color:', err);
      }

      // Retry with minimal options if palette failed
      try {
        const fallbackApps = await InstalledApps.getApps({
          includeVersion: false,
          includeAccentColor: false,
        });
        if (Array.isArray(fallbackApps) && fallbackApps.length > 0) {
          return fallbackApps;
        }
      } catch (err2) {
        console.warn('getApps fallback error:', err2);
      }
    }

    return MOCK_APPS;
  },

  async getSortedApps(options?: GetAppsOptions): Promise<AppDetail[]> {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        const apps = await InstalledApps.getSortedApps(options);
        if (Array.isArray(apps) && apps.length > 0) {
          return apps;
        }
      } catch (err) {
        console.warn('getSortedApps error, sorting getApps():', err);
      }
    }

    const apps = await this.getApps(options);
    return [...apps].sort((a, b) =>
      (a.label || '').toLowerCase().localeCompare((b.label || '').toLowerCase())
    );
  },

  startListeningForAppInstallations(callback: (app: AppDetail) => void): void {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        InstalledApps.startListeningForAppInstallations(callback);
        return;
      } catch (err) {
        console.warn('startListeningForAppInstallations error:', err);
      }
    }
    installListeners.push(callback);
  },

  stopListeningForAppInstallations(): void {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        InstalledApps.stopListeningForAppInstallations();
        return;
      } catch (err) {
        console.warn('stopListeningForAppInstallations error:', err);
      }
    }
    installListeners = [];
  },

  startListeningForAppRemovals(callback: (packageName: string) => void): void {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        InstalledApps.startListeningForAppRemovals(callback);
        return;
      } catch (err) {
        console.warn('startListeningForAppRemovals error:', err);
      }
    }
    removalListeners.push(callback);
  },

  stopListeningForAppRemovals(): void {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        InstalledApps.stopListeningForAppRemovals();
        return;
      } catch (err) {
        console.warn('stopListeningForAppRemovals error:', err);
      }
    }
    removalListeners = [];
  },

  async launchApplication(
    bundleId: string,
    params?: LaunchParams
  ): Promise<{ success: boolean; message?: string }> {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        RNLauncherKitHelper.launchApplication(bundleId, params as any);
        return { success: true };
      } catch (err: any) {
        console.error('Failed to launch application:', err);
        return { success: false, message: err?.message || 'Failed to launch application' };
      }
    }

    return {
      success: true,
      message: `[Preview] Launched ${bundleId}`,
    };
  },

  async checkIfPackageInstalled(bundleId: string): Promise<boolean> {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        return await RNLauncherKitHelper.checkIfPackageInstalled(bundleId);
      } catch (err) {
        console.warn('checkIfPackageInstalled error:', err);
      }
    }
    return MOCK_APPS.some((app) => app.packageName === bundleId);
  },

  async getDefaultLauncherPackageName(): Promise<string> {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        return await RNLauncherKitHelper.getDefaultLauncherPackageName();
      } catch (err: any) {
        return 'com.anonymous.appicon (This App)';
      }
    }
    return 'com.google.android.apps.nexuslauncher';
  },

  async requestDefaultLauncher(): Promise<boolean> {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        return await RNLauncherKitHelper.requestDefaultLauncher();
      } catch (err) {
        console.warn('requestDefaultLauncher error:', err);
        return false;
      }
    }
    return true;
  },

  async openSetDefaultLauncher(): Promise<boolean> {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        return await RNLauncherKitHelper.openSetDefaultLauncher();
      } catch (err) {
        console.warn('openSetDefaultLauncher error:', err);
        return false;
      }
    }
    return true;
  },

  async getBatteryStatus(): Promise<BatteryStatus> {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        return await RNLauncherKitHelper.getBatteryStatus();
      } catch (err) {
        console.warn('getBatteryStatus error:', err);
      }
    }
    return mockBattery;
  },

  startListeningForBatteryChanges(callback: (status: BatteryStatus) => void): void {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        RNLauncherKitHelper.startListeningForBatteryChanges(callback as any);
        return;
      } catch (err) {
        console.warn('startListeningForBatteryChanges error:', err);
      }
    }
    batteryListeners.push(callback);
  },

  stopListeningForBatteryChanges(): void {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        RNLauncherKitHelper.stopListeningForBatteryChanges();
        return;
      } catch (err) {
        console.warn('stopListeningForBatteryChanges error:', err);
      }
    }
    batteryListeners = [];
  },

  async openAlarmApp(): Promise<{ success: boolean; message?: string }> {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        RNLauncherKitHelper.openAlarmApp();
        return { success: true };
      } catch (err: any) {
        return { success: false, message: err?.message };
      }
    }
    return { success: true, message: 'Simulated alarm open' };
  },

  async goToSettings(): Promise<{ success: boolean; message?: string }> {
    if (isAndroid && isNativeLauncherKitAvailable()) {
      try {
        RNLauncherKitHelper.goToSettings();
        return { success: true };
      } catch (err: any) {
        return { success: false, message: err?.message };
      }
    }
    return { success: true, message: 'Simulated settings open' };
  },

  // Pin shortcut directly to device home screen
  async pinShortcutToDevice(
    packageName: string,
    label: string,
    iconUri?: string
  ): Promise<{ success: boolean; message?: string }> {
    return await DeviceIconService.pinShortcutToDevice(packageName, label, iconUri);
  },

  // Change the app's own icon on device launcher
  async changeAppDeviceIcon(
    aliasKey: 'default' | 'globe' | 'chat' | 'music' | 'camera' | 'cube'
  ): Promise<{ success: boolean; message?: string }> {
    return await DeviceIconService.changeAppDeviceIcon(aliasKey);
  },

  // Simulation helpers for testing/preview
  simulateMockAppInstall(app: AppDetail) {
    installListeners.forEach((fn) => fn(app));
  },
  simulateMockAppRemoval(packageName: string) {
    removalListeners.forEach((fn) => fn(packageName));
  },
  simulateMockBatteryChange(status: BatteryStatus) {
    mockBattery = status;
    batteryListeners.forEach((fn) => fn(status));
  },
};
