import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LauncherKitService,
  BatteryStatus,
  IntentAction,
} from '@/services/launcher-kit';
import { PRESET_ICONS } from '@/services/icon-storage';
import { EventBanner, EventMessage } from '@/components/event-banner';
import { MatteBlackTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ExploreFeaturesScreen() {
  const insets = useSafeAreaInsets();

  const [battery, setBattery] = useState<BatteryStatus>({ level: 100, isCharging: false });
  const [defaultLauncher, setDefaultLauncher] = useState<string>('Loading...');
  const [eventLogs, setEventLogs] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<EventMessage | null>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setEventLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const showToast = (title: string, subtitle?: string, type: any = 'info') => {
    setToastMessage({
      id: Date.now().toString(),
      title,
      subtitle,
      type,
    });
  };

  useEffect(() => {
    // Initial fetch
    LauncherKitService.getDefaultLauncherPackageName().then((name) => {
      setDefaultLauncher(name);
      addLog(`Default Launcher: ${name}`);
    });

    LauncherKitService.getBatteryStatus().then((b) => {
      setBattery(b);
      addLog(`Initial Battery: ${b.level}% (${b.isCharging ? 'Charging' : 'Discharging'})`);
    });

    // Start battery listener
    LauncherKitService.startListeningForBatteryChanges((status) => {
      setBattery(status);
      addLog(`Battery Event: ${status.level}% (${status.isCharging ? 'Charging' : 'Discharging'})`);
      showToast('Battery Update', `${status.level}% - ${status.isCharging ? 'Charging' : 'Discharging'}`);
    });

    // Start install listener
    LauncherKitService.startListeningForAppInstallations((app) => {
      addLog(`App Installed Event: ${app.label || 'App'} (${app.packageName})`);
      showToast('App Installed', app.label || app.packageName, 'install');
    });

    // Start removal listener
    LauncherKitService.startListeningForAppRemovals((pkg) => {
      addLog(`App Removed Event: ${pkg}`);
      showToast('App Removed', pkg, 'remove');
    });

    return () => {
      LauncherKitService.stopListeningForBatteryChanges();
      LauncherKitService.stopListeningForAppInstallations();
      LauncherKitService.stopListeningForAppRemovals();
    };
  }, []);

  const handleTestPinShortcut = async () => {
    addLog('Testing ShortcutManager.requestPinShortcut...');
    const res = await LauncherKitService.pinShortcutToDevice(
      'com.android.chrome',
      'Chrome (Custom)',
      ''
    );
    addLog(`Pin shortcut result: ${res.message}`);
    showToast('Device Shortcut', res.message, res.success ? 'success' : 'warning');
  };

  const handleTestDeviceIcon = async (alias: any) => {
    addLog(`Switching device app icon to ${alias}...`);
    const res = await LauncherKitService.changeAppDeviceIcon(alias);
    addLog(`Device icon change result: ${res.message}`);
    showToast('Device Icon', res.message, res.success ? 'success' : 'warning');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 110 },
      ]}
    >
      <EventBanner event={toastMessage} onDismiss={() => setToastMessage(null)} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Diagnostics & Features</Text>
        <Text style={styles.subtitle}>
          Full diagnostics for <Text style={styles.highlightText}>react-native-launcher-kit</Text> & device icon system
        </Text>
      </View>

      {/* Device & Platform Mode */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Runtime Architecture</Text>
          <View style={styles.platformBadge}>
            <Text style={styles.platformBadgeText}>
              {LauncherKitService.isNativeModuleAvailable()
                ? 'KOTLIN TURBOMODULE (ACTIVE)'
                : 'PREVIEW / EXPO GO MODE'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>
          Supports Android 10+ RoleManager, ShortcutManager pinned shortcuts, and activity-alias icon swapping.
        </Text>
      </View>

      {/* Device Home Screen Shortcut Pinning */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>1. Device Home Screen Shortcut Pinning</Text>
        <Text style={styles.cardDescription}>
          Places an app shortcut with the custom icon directly onto your phone's Android home screen via <Text style={styles.codeText}>ShortcutManager</Text>:
        </Text>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleTestPinShortcut}
        >
          <Ionicons name="pin" size={15} color="#000000" style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnText}>PIN CHROME SHORTCUT TO PHONE SCREEN</Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic App Icon on Device */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>2. Change App's Own Icon on Device</Text>
        <Text style={styles.cardDescription}>
          Switches this launcher's icon in your Android phone's app drawer via <Text style={styles.codeText}>activity-alias</Text>:
        </Text>

        <View style={styles.aliasRow}>
          <TouchableOpacity
            style={styles.aliasButton}
            onPress={() => handleTestDeviceIcon('default')}
          >
            <Text style={styles.aliasBtnText}>ROCKET</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.aliasButton}
            onPress={() => handleTestDeviceIcon('globe')}
          >
            <Text style={styles.aliasBtnText}>GLOBE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.aliasButton}
            onPress={() => handleTestDeviceIcon('chat')}
          >
            <Text style={styles.aliasBtnText}>CHAT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.aliasButton}
            onPress={() => handleTestDeviceIcon('music')}
          >
            <Text style={styles.aliasBtnText}>MUSIC</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.aliasButton}
            onPress={() => handleTestDeviceIcon('camera')}
          >
            <Text style={styles.aliasBtnText}>CAMERA</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.aliasButton}
            onPress={() => handleTestDeviceIcon('cube')}
          >
            <Text style={styles.aliasBtnText}>CUBE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Default Launcher Management */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>3. Default Launcher Management</Text>
        <Text style={styles.cardSub}>Current Default: <Text style={styles.codeText}>{defaultLauncher}</Text></Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={async () => {
              addLog('Requesting RoleManager.ROLE_HOME...');
              const res = await LauncherKitService.requestDefaultLauncher();
              addLog(`requestDefaultLauncher: ${res}`);
              showToast('Role Requested', 'Dialog prompted or already held', 'success');
            }}
          >
            <Ionicons name="home" size={15} color="#000000" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Request Default</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={async () => {
              addLog('Opening ACTION_HOME_SETTINGS...');
              const res = await LauncherKitService.openSetDefaultLauncher();
              addLog(`openSetDefaultLauncher: ${res}`);
              showToast('Settings Opened', 'Home settings intent dispatched');
            }}
          >
            <Ionicons name="options-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.secondaryBtnText}>Settings Page</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Battery Status & Listener */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>4. Battery Monitoring</Text>
        <View style={styles.batteryStatusRow}>
          <Text style={styles.batteryBigText}>
            {battery.level}%
          </Text>
          <View style={[styles.chargingBadge, battery.isCharging && styles.chargingActive]}>
            <Text style={[styles.chargingBadgeText, battery.isCharging && styles.chargingActiveText]}>
              {battery.isCharging ? 'CHARGING' : 'BATTERY'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={async () => {
            const b = await LauncherKitService.getBatteryStatus();
            setBattery(b);
            addLog(`One-shot battery query: ${b.level}%, isCharging=${b.isCharging}`);
            showToast('Battery Status', `${b.level}% (${b.isCharging ? 'Charging' : 'Discharging'})`);
          }}
        >
          <Ionicons name="sync-outline" size={15} color="#000000" style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnText}>Query Battery (One-Shot)</Text>
        </TouchableOpacity>
      </View>

      {/* System Shortcuts */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>5. System Shortcuts</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={async () => {
              addLog('Triggering openAlarmApp()...');
              const res = await LauncherKitService.openAlarmApp();
              addLog(`openAlarmApp: success=${res.success}`);
              showToast('Alarm App', 'Dispatched clock intent');
            }}
          >
            <Ionicons name="alarm" size={15} color="#000000" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>OPEN ALARM</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={async () => {
              addLog('Triggering goToSettings()...');
              const res = await LauncherKitService.goToSettings();
              addLog(`goToSettings: success=${res.success}`);
              showToast('Settings', 'Dispatched settings intent');
            }}
          >
            <Ionicons name="settings" size={15} color="#000000" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>OPEN SETTINGS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom Intent Demos */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>6. Intent Dispatcher</Text>
        <View style={styles.demoIntentList}>
          <TouchableOpacity
            style={styles.intentDemoBtn}
            onPress={() => {
              addLog('Launching Chrome with https://expo.dev...');
              LauncherKitService.launchApplication('com.android.chrome', {
                action: IntentAction.VIEW,
                data: 'https://expo.dev',
              });
              showToast('Intent Launched', 'Chrome -> https://expo.dev');
            }}
          >
            <Text style={styles.intentDemoTitle}>OPEN WEB URL (CHROME)</Text>
            <Text style={styles.intentDemoSub}>action: VIEW, data: https://expo.dev</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.intentDemoBtn}
            onPress={() => {
              addLog('Launching Maps with geo coordinates...');
              LauncherKitService.launchApplication('com.google.android.apps.maps', {
                action: IntentAction.VIEW,
                data: 'geo:40.7580,-73.9855?q=Times+Square',
              });
              showToast('Intent Launched', 'Maps -> Times Square');
            }}
          >
            <Text style={styles.intentDemoTitle}>OPEN LOCATION (MAPS)</Text>
            <Text style={styles.intentDemoSub}>action: VIEW, data: geo:40.7580,-73.9855</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Preset Custom Icons Showcase */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>7. Themed Preset Icons</Text>
        <Text style={styles.cardDescription}>
          The 6 high-resolution icons available to replace any app icon or pin to device:
        </Text>

        <View style={styles.presetsGrid}>
          {PRESET_ICONS.map((preset) => (
            <View key={preset.id} style={styles.presetBox}>
              <Image source={preset.source} style={styles.presetThumb} />
              <Text style={styles.presetCaption}>{preset.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Diagnostics Event Log */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.cardHeader}>8. Live Event Diagnostics Log</Text>
          <TouchableOpacity
            onPress={() => setEventLogs([])}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="trash-outline" size={13} color="#737373" style={{ marginRight: 4 }} />
            <Text style={styles.clearLogText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {!LauncherKitService.isNativeModuleAvailable() && (
          <View style={styles.simButtonsRow}>
            <TouchableOpacity
              style={styles.simBtn}
              onPress={() => {
                LauncherKitService.simulateMockAppInstall({
                  label: 'Simulated App',
                  packageName: `com.simulated.app.${Date.now().toString().slice(-4)}`,
                  icon: '',
                  version: '1.0.0',
                  accentColor: '#10B981',
                });
              }}
            >
              <Text style={styles.simBtnText}>+ Install</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simBtn}
              onPress={() => {
                LauncherKitService.simulateMockAppRemoval('com.simulated.app.test');
              }}
            >
              <Text style={styles.simBtnText}>- Remove</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simBtn}
              onPress={() => {
                const nextBat = { level: Math.max(10, battery.level - 5), isCharging: !battery.isCharging };
                LauncherKitService.simulateMockBatteryChange(nextBat);
              }}
            >
              <Text style={styles.simBtnText}>Toggle Battery</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.logConsole}>
          {eventLogs.length === 0 ? (
            <Text style={styles.emptyLogText}>Listening for system events...</Text>
          ) : (
            eventLogs.map((log, idx) => (
              <Text key={idx} style={styles.logLine}>
                {log}
              </Text>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#71717A',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  highlightText: {
    color: MatteBlackTheme.accent,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
    gap: 12,
  },
  cardHeader: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cardSub: {
    color: '#A3A3A3',
    fontSize: 13,
  },
  cardDescription: {
    color: '#737373',
    fontSize: 12,
    lineHeight: 16,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  platformBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  platformBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#FFFFFF',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionBtnText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#333333',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  aliasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aliasButton: {
    backgroundColor: '#161616',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
  },
  aliasBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  batteryStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  batteryBigText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  chargingBadge: {
    backgroundColor: '#262626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chargingActive: {
    backgroundColor: '#FFFFFF',
  },
  chargingBadgeText: {
    color: '#A3A3A3',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chargingActiveText: {
    color: '#000000',
  },
  demoIntentList: {
    gap: 8,
  },
  intentDemoBtn: {
    backgroundColor: '#161616',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262626',
  },
  intentDemoTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  intentDemoSub: {
    color: '#737373',
    fontSize: 11,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetBox: {
    width: '30%',
    backgroundColor: '#161616',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  presetThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginBottom: 4,
  },
  presetCaption: {
    color: '#A3A3A3',
    fontSize: 10,
    textAlign: 'center',
  },
  clearLogText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  simBtn: {
    flex: 1,
    backgroundColor: '#161616',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  simBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  logConsole: {
    backgroundColor: '#050505',
    borderRadius: 10,
    padding: 12,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#262626',
  },
  emptyLogText: {
    color: '#525252',
    fontSize: 12,
    fontStyle: 'italic',
  },
  logLine: {
    color: '#E5E5E5',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
});
