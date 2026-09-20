import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  AppDetail,
  LauncherKitService,
  IntentAction,
  MimeType,
} from '@/services/launcher-kit';
import { PRESET_ICONS, PresetIcon } from '@/services/icon-storage';
import { MatteBlackTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_FALLBACK_ICON = require('@/assets/images/default-app-icon.png');

interface Props {
  app: AppDetail | null;
  customIconUri?: string;
  visible: boolean;
  onClose: () => void;
  onIconReplaced: (packageName: string, newUri: string | null) => void;
  onShowMessage: (title: string, subtitle?: string, type?: any) => void;
}

export function AppActionModal({
  app,
  customIconUri,
  visible,
  onClose,
  onIconReplaced,
  onShowMessage,
}: Props) {
  if (!app) return null;

  const [activeTab, setActiveTab] = useState<'launch' | 'intent' | 'replace' | 'device' | 'info'>('launch');
  
  // Custom intent parameters state
  const [selectedAction, setSelectedAction] = useState<string>(IntentAction.VIEW);
  const [intentData, setIntentData] = useState<string>('https://google.com');
  const [mimeType, setMimeType] = useState<string>('*/*');
  const [extraKey, setExtraKey] = useState<string>('');
  const [extraVal, setExtraVal] = useState<string>('');

  // Package check status
  const [checkStatus, setCheckStatus] = useState<string | null>(null);

  const displayIconSource = customIconUri
    ? { uri: customIconUri }
    : app.icon && app.icon.trim().length > 0
    ? { uri: app.icon.startsWith('file://') ? app.icon : `file://${app.icon}` }
    : DEFAULT_FALLBACK_ICON;

  // Handle direct launch
  const handleDirectLaunch = async () => {
    const res = await LauncherKitService.launchApplication(app.packageName);
    if (res.success) {
      onShowMessage('App Launched', app.label, 'success');
      onClose();
    } else {
      Alert.alert('Launch Failed', res.message || 'Could not launch app');
    }
  };

  // Handle launch with intent
  const handleIntentLaunch = async () => {
    const extras: Record<string, string> = {};
    if (extraKey.trim() && extraVal.trim()) {
      extras[extraKey.trim()] = extraVal.trim();
    }

    const res = await LauncherKitService.launchApplication(app.packageName, {
      action: selectedAction,
      data: intentData.trim() ? intentData.trim() : undefined,
      type: mimeType.trim() ? mimeType.trim() : undefined,
      extras: Object.keys(extras).length > 0 ? extras : undefined,
    });

    if (res.success) {
      onShowMessage('Intent Sent', `${selectedAction} -> ${app.label}`, 'success');
      onClose();
    } else {
      Alert.alert('Intent Launch Failed', res.message || 'Error occurred while launching intent');
    }
  };

  // Handle pick image from gallery
  const handlePickCustomImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Media library access is needed to pick an icon image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const pickedUri = result.assets[0].uri;
        onIconReplaced(app.packageName, pickedUri);
        onShowMessage('Icon Applied to App', `Tap "Pin to Device Home Screen" below to place it on phone!`, 'success');
      }
    } catch (err: any) {
      Alert.alert('Image Picker Error', err?.message || 'Could not pick image');
    }
  };

  // Handle preset icon selection
  const handleSelectPreset = (preset: PresetIcon) => {
    const assetSource = Image.resolveAssetSource(preset.source);
    onIconReplaced(app.packageName, assetSource.uri);
    onShowMessage('Preset Applied', `Selected "${preset.name}". You can now pin it to device!`, 'success');
  };

  // Handle reset icon
  const handleResetIcon = () => {
    onIconReplaced(app.packageName, null);
    onShowMessage('Icon Reset', `Restored default icon for ${app.label}`, 'info');
  };

  // Handle pin shortcut to device home screen
  const handlePinToDevice = async () => {
    const iconToUse = customIconUri || app.icon;
    const res = await LauncherKitService.pinShortcutToDevice(
      app.packageName,
      app.label,
      iconToUse
    );

    if (res.success) {
      onShowMessage('Shortcut Created', res.message || 'Added to your phone home screen!', 'success');
      Alert.alert(
        'Shortcut Added to Phone Screen',
        `A shortcut for "${app.label}" with your custom icon has been placed onto your device home screen.\n\nYou can use it directly with your phone's normal launcher (Samsung, Pixel, etc.) without setting this app as default!`
      );
    } else {
      Alert.alert('Pinning Failed', res.message || 'Could not create shortcut on device.');
    }
  };

  // Handle dynamic app icon change (for this launcher app)
  const handleChangeDeviceAppIcon = async (alias: 'default' | 'globe' | 'chat' | 'music' | 'camera' | 'cube') => {
    const res = await LauncherKitService.changeAppDeviceIcon(alias);
    if (res.success) {
      onShowMessage('Device Icon Changed', `Launcher icon set to ${alias.toUpperCase()} on phone!`, 'success');
      Alert.alert(
        'App Icon Updated on Device',
        `The app's launcher icon has been updated to "${alias.toUpperCase()}" on your device home screen.`
      );
    } else {
      Alert.alert('Icon Change Failed', res.message || 'Could not update app icon on device.');
    }
  };

  // Check package
  // Check package
  const handleCheckPackage = async () => {
    const isInstalled = await LauncherKitService.checkIfPackageInstalled(app.packageName);
    setCheckStatus(isInstalled ? '[INSTALLED] Package is present on device' : '[NOT FOUND] Package is not installed');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />

          {/* Header Card */}
          <View style={styles.header}>
            <Image source={displayIconSource} style={styles.headerIcon} />
            <View style={styles.headerMeta}>
              <Text style={styles.appName} numberOfLines={1}>
                {app.label}
              </Text>
              <Text style={styles.packageName} numberOfLines={1}>
                {app.packageName}
              </Text>
              <View style={styles.badgeRow}>
                {app.version ? (
                  <View style={styles.versionBadge}>
                    <Text style={styles.badgeText}>v{app.version}</Text>
                  </View>
                ) : null}
                {customIconUri ? (
                  <View style={styles.customIconBadge}>
                    <Text style={styles.customBadgeText}>CUSTOM ICON</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {/* iOS Segmented Control */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentItem, activeTab === 'launch' && styles.segmentItemActive]}
              onPress={() => setActiveTab('launch')}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, activeTab === 'launch' && styles.segmentTextActive]}>
                Launch
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentItem, activeTab === 'replace' && styles.segmentItemActive]}
              onPress={() => setActiveTab('replace')}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, activeTab === 'replace' && styles.segmentTextActive]}>
                Icon & Pin
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentItem, activeTab === 'intent' && styles.segmentItemActive]}
              onPress={() => setActiveTab('intent')}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, activeTab === 'intent' && styles.segmentTextActive]}>
                Intent
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentItem, activeTab === 'info' && styles.segmentItemActive]}
              onPress={() => setActiveTab('info')}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, activeTab === 'info' && styles.segmentTextActive]}>
                Status
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Area */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Tab: Direct Launch */}
            {activeTab === 'launch' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Direct Launch</Text>
                <Text style={styles.sectionDescription}>
                  Launch {app.label} immediately using native Android intent.
                </Text>

                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={handleDirectLaunch}
                >
                  <Ionicons name="play" size={16} color="#000000" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryActionText}>OPEN APPLICATION</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.devicePinButton}
                  onPress={handlePinToDevice}
                >
                  <Ionicons name="pin" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.devicePinButtonText}>
                    PIN SHORTCUT TO PHONE SCREEN
                  </Text>
                </TouchableOpacity>
                <Text style={styles.sectionHint}>
                  Works with your phone's normal launcher (Samsung, Pixel, etc.) — no default launcher setup needed!
                </Text>
              </View>
            )}

            {/* Tab: Replace App Icon & Device Pinning */}
            {activeTab === 'replace' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Replace App Icon</Text>
                <Text style={styles.sectionDescription}>
                  Change the app's icon, and pin a shortcut directly onto your phone's real home screen.
                </Text>

                {/* Device Pin Action Banner */}
                <TouchableOpacity
                  style={styles.devicePinHighlightBtn}
                  onPress={handlePinToDevice}
                >
                  <View style={styles.devicePinBadge}>
                    <Ionicons name="pin" size={14} color="#000000" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.devicePinHighlightTitle}>
                      Pin Shortcut to Device Home Screen
                    </Text>
                    <Text style={styles.devicePinHighlightSub}>
                      Puts this app with your custom icon right on your phone's real home screen (Works with your current launcher!)
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pickImageButton}
                  onPress={handlePickCustomImage}
                >
                  <Ionicons name="images-outline" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.pickImageButtonText}>
                    CHOOSE IMAGE FROM GALLERY
                  </Text>
                </TouchableOpacity>

                <Text style={styles.presetHeading}>Choose a Themed Icon Preset:</Text>
                <View style={styles.presetGrid}>
                  {PRESET_ICONS.map((preset) => (
                    <TouchableOpacity
                      key={preset.id}
                      style={styles.presetItem}
                      onPress={() => handleSelectPreset(preset)}
                    >
                      <Image source={preset.source} style={styles.presetImage} />
                      <Text style={styles.presetName}>{preset.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {customIconUri ? (
                  <TouchableOpacity
                    style={styles.resetIconButton}
                    onPress={handleResetIcon}
                  >
                    <Ionicons name="refresh-outline" size={15} color="#A3A3A3" style={{ marginRight: 6 }} />
                    <Text style={styles.resetIconButtonText}>
                      RESTORE ORIGINAL SYSTEM ICON
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {/* Section: Change this app's own icon on device */}
                <View style={styles.ownAppIconCard}>
                  <Text style={styles.ownAppIconTitle}>
                    CHANGE LAUNCHER APP ICON
                  </Text>
                  <Text style={styles.ownAppIconSub}>
                    Switch this launcher's icon in your phone's app drawer via Android activity-alias:
                  </Text>
                  <View style={styles.ownAppIconRow}>
                    <TouchableOpacity
                      style={styles.aliasChip}
                      onPress={() => handleChangeDeviceAppIcon('default')}
                    >
                      <Text style={styles.aliasChipText}>ROCKET</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.aliasChip}
                      onPress={() => handleChangeDeviceAppIcon('globe')}
                    >
                      <Text style={styles.aliasChipText}>GLOBE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.aliasChip}
                      onPress={() => handleChangeDeviceAppIcon('chat')}
                    >
                      <Text style={styles.aliasChipText}>CHAT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.aliasChip}
                      onPress={() => handleChangeDeviceAppIcon('music')}
                    >
                      <Text style={styles.aliasChipText}>MUSIC</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.aliasChip}
                      onPress={() => handleChangeDeviceAppIcon('camera')}
                    >
                      <Text style={styles.aliasChipText}>CAMERA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.aliasChip}
                      onPress={() => handleChangeDeviceAppIcon('cube')}
                    >
                      <Text style={styles.aliasChipText}>CUBE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Tab: Advanced Intent Launch */}
            {activeTab === 'intent' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Custom Intent Launcher</Text>
                <Text style={styles.sectionDescription}>
                  Dispatch custom Android intents with action, URI data, MIME types, and extras.
                </Text>

                <Text style={styles.fieldLabel}>Intent Action</Text>
                <View style={styles.actionChipRow}>
                  {[IntentAction.VIEW, IntentAction.MAIN, IntentAction.SEND].map((act) => (
                    <TouchableOpacity
                      key={act}
                      style={[
                        styles.actionChip,
                        selectedAction === act && styles.actionChipActive,
                      ]}
                      onPress={() => setSelectedAction(act)}
                    >
                      <Text
                        style={[
                          styles.actionChipText,
                          selectedAction === act && styles.actionChipTextActive,
                        ]}
                      >
                        {act.replace('android.intent.action.', '')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Data URI</Text>
                <TextInput
                  style={styles.input}
                  value={intentData}
                  onChangeText={setIntentData}
                  placeholder="e.g. geo:40.7580,-73.9855 or https://google.com"
                  placeholderTextColor={MatteBlackTheme.textMuted}
                  autoCapitalize="none"
                />

                <Text style={styles.fieldLabel}>MIME Type</Text>
                <TextInput
                  style={styles.input}
                  value={mimeType}
                  onChangeText={setMimeType}
                  placeholder="e.g. */*, text/plain, application/pdf"
                  placeholderTextColor={MatteBlackTheme.textMuted}
                  autoCapitalize="none"
                />

                <Text style={styles.fieldLabel}>Extra Parameters</Text>
                <View style={styles.extraRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    value={extraKey}
                    onChangeText={setExtraKey}
                    placeholder="Key"
                    placeholderTextColor={MatteBlackTheme.textMuted}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={extraVal}
                    onChangeText={setExtraVal}
                    placeholder="Value"
                    placeholderTextColor={MatteBlackTheme.textMuted}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryActionButton, { marginTop: 12 }]}
                  onPress={handleIntentLaunch}
                >
                  <Ionicons name="send" size={15} color="#000000" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryActionText}>DISPATCH INTENT</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Tab: Info & Package Check */}
            {activeTab === 'info' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Package Status Check</Text>
                <Text style={styles.sectionDescription}>
                  Verify package presence on device via <Text style={styles.codeText}>checkIfPackageInstalled</Text>.
                </Text>

                <TouchableOpacity
                  style={styles.checkButton}
                  onPress={handleCheckPackage}
                >
                  <Ionicons name="shield-checkmark-outline" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.checkButtonText}>VERIFY PACKAGE STATUS</Text>
                </TouchableOpacity>

                {checkStatus && (
                  <View style={styles.checkStatusBox}>
                    <Text style={styles.checkStatusText}>{checkStatus}</Text>
                  </View>
                )}

                <View style={styles.metaBox}>
                  <Text style={styles.metaRowText}>
                    <Text style={styles.metaLabel}>Label: </Text>
                    {app.label}
                  </Text>
                  <Text style={styles.metaRowText}>
                    <Text style={styles.metaLabel}>Package: </Text>
                    {app.packageName}
                  </Text>
                  <Text style={styles.metaRowText}>
                    <Text style={styles.metaLabel}>Version: </Text>
                    {app.version || 'Not provided'}
                  </Text>
                  <Text style={styles.metaRowText}>
                    <Text style={styles.metaLabel}>Accent Color: </Text>
                    {app.accentColor || 'None extracted'}
                  </Text>
                  <Text style={styles.metaRowText} numberOfLines={2}>
                    <Text style={styles.metaLabel}>Icon Path: </Text>
                    {app.icon || 'Fallback placeholder'}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: '#0D0D0D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: '#222222',
    paddingBottom: 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3F3F46',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 13,
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  headerMeta: {
    flex: 1,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  packageName: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  versionBadge: {
    backgroundColor: '#161616',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#222222',
  },
  badgeText: {
    color: '#A1A1AA',
    fontSize: 10,
    fontWeight: '600',
  },
  customIconBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  customBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 3,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  body: {
    maxHeight: 450,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionDescription: {
    color: '#71717A',
    fontSize: 12,
    lineHeight: 16,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#FFFFFF',
  },
  primaryActionButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  primaryActionText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  devicePinButton: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  devicePinButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHint: {
    color: '#52525B',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 2,
  },
  devicePinHighlightBtn: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  devicePinBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  devicePinHighlightTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  devicePinHighlightSub: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 1,
  },
  fieldLabel: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  actionChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionChip: {
    backgroundColor: '#141414',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#222222',
  },
  actionChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  actionChipText: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
  },
  actionChipTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#141414',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#222222',
  },
  extraRow: {
    flexDirection: 'row',
  },
  pickImageButton: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 2,
  },
  pickImageButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  presetHeading: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  presetItem: {
    width: '31%',
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222222',
  },
  presetImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginBottom: 4,
  },
  presetName: {
    color: '#A1A1AA',
    fontSize: 10,
    textAlign: 'center',
  },
  resetIconButton: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222222',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 6,
  },
  resetIconButtonText: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
  },
  ownAppIconCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#202020',
    gap: 6,
  },
  ownAppIconTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  ownAppIconSub: {
    color: '#71717A',
    fontSize: 10,
    lineHeight: 14,
  },
  ownAppIconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  aliasChip: {
    backgroundColor: '#181818',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262626',
  },
  aliasChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  checkButton: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#333333',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 2,
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  checkStatusBox: {
    backgroundColor: '#141414',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#262626',
  },
  checkStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  metaBox: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  metaRowText: {
    color: '#71717A',
    fontSize: 11,
  },
  metaLabel: {
    color: '#E4E4E7',
    fontWeight: '600',
  },
});
