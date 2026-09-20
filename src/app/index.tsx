import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppDetail,
  BatteryStatus,
  LauncherKitService,
} from '@/services/launcher-kit';
import {
  getCustomIcons,
  setCustomIcon,
  removeCustomIcon,
} from '@/services/icon-storage';
import { AppActionModal } from '@/components/app-action-modal';
import { EventBanner, EventMessage } from '@/components/event-banner';
import { MatteBlackTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_FALLBACK_ICON = require('@/assets/images/default-app-icon.png');

export default function LauncherHomeScreen() {
  const [apps, setApps] = useState<AppDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSorted, setIsSorted] = useState<boolean>(true);
  const [isGridView, setIsGridView] = useState<boolean>(true);
  const [includeVersion, setIncludeVersion] = useState<boolean>(true);

  // System & Battery state
  const [battery, setBattery] = useState<BatteryStatus>({
    level: 100,
    isCharging: false,
  });
  const [defaultLauncher, setDefaultLauncher] = useState<string>('Loading...');

  // Live iPhone Clock & Date state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showTools, setShowTools] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const timeString = `${displayHours}:${displayMinutes}`;
  const ampm = hours >= 12 ? 'PM' : 'AM';

  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Package check tool state
  const [customPackageInput, setCustomPackageInput] = useState<string>('com.android.chrome');
  const [packageCheckResult, setPackageCheckResult] = useState<string | null>(null);

  // Custom icon mappings: { [packageName]: uri }
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});

  // Selected app for action modal
  const [selectedApp, setSelectedApp] = useState<AppDetail | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState<boolean>(false);

  // Toast / event banner
  const [bannerEvent, setBannerEvent] = useState<EventMessage | null>(null);

  const showToast = useCallback(
    (title: string, subtitle?: string, type: any = 'info') => {
      setBannerEvent({
        id: Date.now().toString(),
        title,
        subtitle,
        type,
      });
    },
    []
  );

  // Load custom icon replacements from storage
  const loadSavedIcons = async () => {
    const saved = await getCustomIcons();
    setCustomIcons(saved);
  };

  // Fetch installed apps
  const fetchInstalledApps = useCallback(async () => {
    setLoading(true);
    try {
      const opts = { includeVersion, includeAccentColor: false };
      const list = isSorted
        ? await LauncherKitService.getSortedApps(opts)
        : await LauncherKitService.getApps(opts);
      setApps(list);
    } catch (err) {
      console.warn('Error fetching apps:', err);
    } finally {
      setLoading(false);
    }
  }, [isSorted, includeVersion]);

  // Load system info: default launcher & battery
  const loadSystemInfo = useCallback(async () => {
    const launcherName = await LauncherKitService.getDefaultLauncherPackageName();
    setDefaultLauncher(launcherName);

    const bat = await LauncherKitService.getBatteryStatus();
    setBattery(bat);
  }, []);

  useEffect(() => {
    loadSavedIcons();
    fetchInstalledApps();
    loadSystemInfo();

    // Listen for real-time battery updates
    LauncherKitService.startListeningForBatteryChanges((status) => {
      setBattery(status);
    });

    // Listen for app installations
    LauncherKitService.startListeningForAppInstallations((newApp) => {
      showToast('App Installed', `${newApp.label || 'New App'} (${newApp.packageName})`, 'install');
      fetchInstalledApps();
    });

    // Listen for app removals
    LauncherKitService.startListeningForAppRemovals((removedPackage) => {
      showToast('App Removed', removedPackage, 'remove');
      fetchInstalledApps();
    });

    return () => {
      LauncherKitService.stopListeningForBatteryChanges();
      LauncherKitService.stopListeningForAppInstallations();
      LauncherKitService.stopListeningForAppRemovals();
    };
  }, [fetchInstalledApps, loadSystemInfo, showToast]);

  // Handle icon replacement callback
  const handleIconReplaced = async (packageName: string, newUri: string | null) => {
    if (newUri) {
      await setCustomIcon(packageName, newUri);
      setCustomIcons((prev) => ({ ...prev, [packageName]: newUri }));
    } else {
      await removeCustomIcon(packageName);
      setCustomIcons((prev) => {
        const next = { ...prev };
        delete next[packageName];
        return next;
      });
    }
  };

  // Quick launch
  const handleAppPress = async (app: AppDetail) => {
    const res = await LauncherKitService.launchApplication(app.packageName);
    if (!res.success) {
      showToast('Launch Issue', res.message, 'warning');
    }
  };

  // Long press / more actions
  const handleAppLongPress = (app: AppDetail) => {
    setSelectedApp(app);
    setActionModalVisible(true);
  };

  // Package check action
  const handleCheckCustomPackage = async () => {
    if (!customPackageInput.trim()) return;
    const isInstalled = await LauncherKitService.checkIfPackageInstalled(
      customPackageInput.trim()
    );
    setPackageCheckResult(
      isInstalled ? '[INSTALLED] Package is present on device' : '[NOT FOUND] Package is not installed'
    );
  };

  // Filter apps (memoized to prevent re-filtering on clock ticks)
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return apps;
    const q = searchQuery.toLowerCase().trim();
    return apps.filter((item) =>
      (item.label && item.label.toLowerCase().includes(q)) ||
      (item.packageName && item.packageName.toLowerCase().includes(q))
    );
  }, [apps, searchQuery]);

  const renderAppItem = ({ item }: { item: AppDetail }) => {
    const customUri = customIcons[item.packageName];
    const iconSource = customUri
      ? { uri: customUri }
      : item.icon && item.icon.trim().length > 0
      ? { uri: item.icon.startsWith('file://') ? item.icon : `file://${item.icon}` }
      : DEFAULT_FALLBACK_ICON;

    if (isGridView) {
      return (
        <TouchableOpacity
          style={styles.gridItem}
          onPress={() => handleAppPress(item)}
          onLongPress={() => handleAppLongPress(item)}
          delayLongPress={350}
          activeOpacity={0.65}
        >
          <View style={styles.gridIconWrapper}>
            <View style={styles.gridIconContainer}>
              <Image source={iconSource} style={styles.gridIconImage} resizeMode="cover" />
            </View>
            {customUri ? (
              <View style={styles.customBadgeIndicator} />
            ) : null}
          </View>
          <Text style={styles.gridLabel} numberOfLines={1}>
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => handleAppPress(item)}
        onLongPress={() => handleAppLongPress(item)}
        delayLongPress={350}
        activeOpacity={0.65}
      >
        <View style={styles.listIconContainer}>
          <Image source={iconSource} style={styles.listIconImage} resizeMode="cover" />
        </View>
        <View style={styles.listDetails}>
          <Text style={styles.listLabel} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={styles.listPackage} numberOfLines={1}>
            {item.packageName}
          </Text>
          <View style={styles.listBadges}>
            {item.version && includeVersion ? (
              <Text style={styles.listVersionText}>v{item.version}</Text>
            ) : null}
            {customUri ? (
              <Text style={styles.listCustomText}>CUSTOM ICON</Text>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => handleAppLongPress(item)}
        >
          <Ionicons name="ellipsis-vertical" size={16} color="#737373" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <EventBanner
        event={bannerEvent}
        onDismiss={() => setBannerEvent(null)}
      />

      <FlatList
        data={filteredApps}
        key={isGridView ? 'grid_4' : 'list_1'}
        numColumns={isGridView ? 4 : 1}
        keyExtractor={(item) => item.packageName}
        renderItem={renderAppItem}
        contentContainerStyle={styles.listContainer}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              fetchInstalledApps();
              loadSystemInfo();
            }}
            tintColor={MatteBlackTheme.accent}
            colors={[MatteBlackTheme.accent]}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Minimalist Top Glance */}
            <View style={styles.glanceContainer}>
              <View style={styles.glanceStatusRow}>
                <Text style={styles.glanceDate}>{formattedDate}</Text>
                <View style={styles.glanceBattery}>
                  {battery.isCharging ? (
                    <Ionicons name="flash" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
                  ) : (
                    <Ionicons name="battery-half-outline" size={13} color="#71717A" style={{ marginRight: 3 }} />
                  )}
                  <Text style={styles.glanceBatteryText}>{battery.level}%</Text>
                </View>
              </View>

              <View style={styles.clockRow}>
                <Text style={styles.clockTime}>{timeString}</Text>
                <Text style={styles.clockAmPm}>{ampm}</Text>
              </View>
            </View>

            {/* Minimalist Spotlight Search Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={15} color="#52525B" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search"
                placeholderTextColor="#52525B"
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#71717A" />
                </TouchableOpacity>
              )}
            </View>

            {/* Minimalist Sub Bar */}
            <View style={styles.subBar}>
              <Text style={styles.appCountText}>
                {filteredApps.length} {filteredApps.length === 1 ? 'APP' : 'APPS'}
              </Text>
              <View style={styles.subBarActions}>
                <TouchableOpacity
                  style={[styles.actionPill, isSorted && styles.actionPillActive]}
                  onPress={() => setIsSorted(!isSorted)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.actionPillText, isSorted && styles.actionPillTextActive]}>A-Z</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionPill, isGridView && styles.actionPillActive]}
                  onPress={() => setIsGridView(!isGridView)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isGridView ? 'grid' : 'list'}
                    size={12}
                    color={isGridView ? '#000000' : '#71717A'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionPill, showTools && styles.actionPillActive]}
                  onPress={() => setShowTools(!showTools)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="options-outline"
                    size={13}
                    color={showTools ? '#000000' : '#71717A'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Minimalist Tools Drawer */}
            {showTools && (
              <View style={styles.toolsDrawer}>
                <View style={styles.toolsQuickRow}>
                  <TouchableOpacity
                    style={styles.toolTile}
                    onPress={() => LauncherKitService.openAlarmApp()}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="alarm-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.toolTileText}>Alarm</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.toolTile}
                    onPress={() => LauncherKitService.goToSettings()}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.toolTileText}>Settings</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.toolTile}
                    onPress={async () => {
                      await LauncherKitService.requestDefaultLauncher();
                      showToast('Default Launcher', 'Role prompt opened');
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="home-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.toolTileText}>Default</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.toolTile}
                    onPress={async () => {
                      await LauncherKitService.openSetDefaultLauncher();
                      showToast('Home Settings', 'Dispatched settings intent');
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="phone-portrait-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.toolTileText}>Home</Text>
                  </TouchableOpacity>
                </View>

                {/* Status & Package Row */}
                <View style={styles.toolsStatusRow}>
                  <Text style={styles.toolsStatusLabel}>DEFAULT LAUNCHER</Text>
                  <Text style={styles.toolsStatusValue} numberOfLines={1}>
                    {defaultLauncher}
                  </Text>
                </View>

                <View style={styles.toolsCheckerRow}>
                  <TextInput
                    style={styles.toolsCheckerInput}
                    value={customPackageInput}
                    onChangeText={(t) => {
                      setCustomPackageInput(t);
                      setPackageCheckResult(null);
                    }}
                    placeholder="Verify package name..."
                    placeholderTextColor="#52525B"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.toolsCheckerBtn}
                    onPress={handleCheckCustomPackage}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.toolsCheckerBtnText}>Check</Text>
                  </TouchableOpacity>
                </View>
                {packageCheckResult ? (
                  <Text style={styles.toolsResultText}>{packageCheckResult}</Text>
                ) : null}

                <TouchableOpacity
                  style={styles.toolsBatteryBtn}
                  onPress={async () => {
                    const b = await LauncherKitService.getBatteryStatus();
                    setBattery(b);
                    showToast('Battery', `${b.level}% (${b.isCharging ? 'Charging' : 'Discharging'})`);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="sync-outline" size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.toolsBatteryBtnText}>SYNC BATTERY ({battery.level}%)</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        ListFooterComponent={<View style={{ height: 16 }} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.emptyText}>Loading installed applications...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>NO APPS FOUND</Text>
              </View>
              <Text style={styles.emptyText}>No applications match your search query</Text>
            </View>
          )
        }
      />

      {/* App Action & Custom Icon Replacement Modal */}
      <AppActionModal
        app={selectedApp}
        customIconUri={selectedApp ? customIcons[selectedApp.packageName] : undefined}
        visible={actionModalVisible}
        onClose={() => {
          setActionModalVisible(false);
          setSelectedApp(null);
        }}
        onIconReplaced={handleIconReplaced}
        onShowMessage={showToast}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 130, // Clearance for centered floating dock
  },
  headerContainer: {
    paddingTop: 8,
    paddingBottom: 14,
    gap: 14,
  },

  // Minimalist Top Glance
  glanceContainer: {
    paddingTop: 4,
    paddingBottom: 2,
    gap: 2,
  },
  glanceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  glanceDate: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  glanceBattery: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glanceBatteryText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '600',
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: -2,
  },
  clockTime: {
    color: '#FFFFFF',
    fontSize: 50,
    fontWeight: '600',
    letterSpacing: -1.5,
  },
  clockAmPm: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
    marginBottom: 7,
  },

  // Minimalist Spotlight Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101010',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },

  // Minimalist Sub Bar
  subBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  appCountText: {
    color: '#52525B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  subBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionPill: {
    backgroundColor: '#101010',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    height: 28,
  },
  actionPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  actionPillText: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
  },
  actionPillTextActive: {
    color: '#000000',
    fontWeight: '800',
  },

  // Minimalist Tools Drawer
  toolsDrawer: {
    backgroundColor: '#0C0C0C',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    gap: 10,
  },
  toolsQuickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toolTile: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    gap: 4,
  },
  toolTileText: {
    color: '#A1A1AA',
    fontSize: 10,
    fontWeight: '600',
  },
  toolsStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  toolsStatusLabel: {
    color: '#52525B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  toolsStatusValue: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 200,
  },
  toolsCheckerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toolsCheckerInput: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#FFFFFF',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#222222',
  },
  toolsCheckerBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolsCheckerBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
  },
  toolsResultText: {
    color: '#A1A1AA',
    fontSize: 11,
    paddingHorizontal: 2,
  },
  toolsBatteryBtn: {
    backgroundColor: '#161616',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#242424',
  },
  toolsBatteryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Minimalist SpringBoard 4-Column App Grid
  gridItem: {
    flex: 1 / 4,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  gridIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridIconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  customBadgeIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  gridLabel: {
    color: '#E4E4E7',
    fontSize: 11,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 5,
    maxWidth: 68,
    letterSpacing: -0.1,
  },

  // List View Option
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  listIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listIconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
  },
  listDetails: {
    flex: 1,
  },
  listLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listPackage: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 1,
  },
  listBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  listVersionText: {
    color: '#52525B',
    fontSize: 10,
  },
  listCustomText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  moreButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 12,
  },
  emptyBox: {
    backgroundColor: '#161616',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyText: {
    color: '#71717A',
    fontSize: 13,
  },
});
