import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { useItems } from '../context/ItemsContext';
import type { ItemListing } from '../types/database';
import { distanceInMiles } from '../utils/location';

type AppStackParamList = {
  Home: undefined;
  Listing: undefined;
  AddItem: undefined;
  Details: { item: ItemListing };
};

type Props = NativeStackScreenProps<AppStackParamList, 'Listing'>;

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

type FilterState = {
  title: string;
  category: string;
  priceMin: string;
  priceMax: string;
  availableDateFrom: Date | null;
  availableDateTo: Date | null;
  renter: string;
  locationZip: string;
  locationCenter: { latitude: number; longitude: number } | null;
  radiusMiles: number | null;
  attributeFilters: Array<{ key: string; value: string }>;
};

const getItemDisplayName = (item: ItemListing) => {
  return item.title || item.attributes?.renter || 'Untitled';
};

const formatPrice = (item: ItemListing) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.pricePerDay);
};

const formatDate = (item: ItemListing) => {
  if (!item.availableDate) return 'N/A';
  const parsed = new Date(item.availableDate);
  return Number.isNaN(parsed.getTime()) ? item.availableDate : parsed.toLocaleDateString();
};

export const ListingScreen: React.FC<Props> = ({ navigation }) => {
  const { items, loading, error, refreshItems } = useItems();
  const [showFilters, setShowFilters] = useState(false);
  const [webFiltersCollapsed, setWebFiltersCollapsed] = useState(false);
  const [filter, setFilter] = useState<FilterState>({
    title: '',
    category: '',
    priceMin: '',
    priceMax: '',
    availableDateFrom: null,
    availableDateTo: null,
    renter: '',
    locationZip: '',
    locationCenter: null,
    radiusMiles: null,
    attributeFilters: [],
  });
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  const useLocationFilter = filter.radiusMiles != null && filter.locationCenter != null;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter.title.trim()) {
        const t = (item.title || '').toLowerCase();
        if (!t.includes(filter.title.toLowerCase())) return false;
      }
      if (filter.category.trim()) {
        const c = (item.category || '').toLowerCase();
        if (!c.includes(filter.category.toLowerCase())) return false;
      }
      if (filter.priceMin.trim()) {
        if (item.pricePerDay < Number(filter.priceMin)) return false;
      }
      if (filter.priceMax.trim()) {
        if (item.pricePerDay > Number(filter.priceMax)) return false;
      }
      if (filter.availableDateFrom) {
        if (!item.availableDate) return false;
        const itemDate = new Date(item.availableDate);
        if (Number.isNaN(itemDate.getTime()) || itemDate < filter.availableDateFrom) return false;
      }
      if (filter.availableDateTo) {
        if (!item.availableDate) return false;
        const itemDate = new Date(item.availableDate);
        if (Number.isNaN(itemDate.getTime()) || itemDate > filter.availableDateTo) return false;
      }
      if (filter.renter.trim()) {
        const r = (item.attributes?.renter as string) ?? '';
        if (!r.toLowerCase().includes(filter.renter.toLowerCase())) return false;
      }
      if (useLocationFilter && filter.locationCenter && filter.radiusMiles != null) {
        const loc = item.location;
        if (!loc) return false;
        const dist = distanceInMiles(filter.locationCenter, loc);
        if (dist > filter.radiusMiles) return false;
      }
      for (const { key, value } of filter.attributeFilters) {
        if (!key.trim()) continue;
        const itemVal = String(item.attributes?.[key.trim()] ?? '').toLowerCase();
        if (!itemVal.includes(value.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, filter, useLocationFilter]);

  const addAttributeFilter = () => {
    if (!newAttrKey.trim()) return;
    setFilter((prev) => ({
      ...prev,
      attributeFilters: [...prev.attributeFilters, { key: newAttrKey.trim(), value: newAttrValue.trim() }],
    }));
    setNewAttrKey('');
    setNewAttrValue('');
  };

  const removeAttributeFilter = (index: number) => {
    setFilter((prev) => ({
      ...prev,
      attributeFilters: prev.attributeFilters.filter((_, i) => i !== index),
    }));
  };

  const fetchCurrentLocationForFilter = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow location access to filter by your location.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setFilter((prev) => ({
        ...prev,
        locationZip: '',
        locationCenter: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
        radiusMiles: prev.radiusMiles ?? 25,
      }));
    } catch (e) {
      Alert.alert('Error', 'Could not get your location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const applyZipForFilter = async () => {
    const zip = filter.locationZip.trim();
    if (!zip) return;
    setLocationLoading(true);
    try {
      const results = await Location.geocodeAsync(`${zip}, USA`);
      if (results.length === 0) {
        Alert.alert('Not found', 'Could not find a location for that ZIP code.');
        return;
      }
      const { latitude, longitude } = results[0];
      setFilter((prev) => ({
        ...prev,
        locationCenter: { latitude, longitude },
        radiusMiles: prev.radiusMiles ?? 25,
      }));
    } catch (e) {
      Alert.alert('Error', 'Could not look up that ZIP code.');
    } finally {
      setLocationLoading(false);
    }
  };

  const clearFilters = () => {
    setFilter({
      title: '',
      category: '',
      priceMin: '',
      priceMax: '',
      availableDateFrom: null,
      availableDateTo: null,
      renter: '',
      locationZip: '',
      locationCenter: null,
      radiusMiles: null,
      attributeFilters: [],
    });
  };

  const hasActiveFilters =
    filter.title.trim() ||
    filter.category.trim() ||
    filter.priceMin.trim() ||
    filter.priceMax.trim() ||
    filter.availableDateFrom ||
    filter.availableDateTo ||
    filter.renter.trim() ||
    useLocationFilter ||
    filter.attributeFilters.length > 0;

  const renderFilterPanel = () => (
    <View style={Platform.OS === 'web' ? webStyles.filterPanel : styles.filterPanel}>
      <Text style={Platform.OS === 'web' ? webStyles.filterSectionTitle : styles.filterSectionTitle}>Title</Text>
      <TextInput
        value={filter.title}
        onChangeText={(t) => setFilter((prev) => ({ ...prev, title: t }))}
        placeholder="Search title..."
        style={Platform.OS === 'web' ? webStyles.filterInput : styles.filterInput}
      />

      <Text style={Platform.OS === 'web' ? webStyles.filterSectionTitle : styles.filterSectionTitle}>Category</Text>
      <TextInput
        value={filter.category}
        onChangeText={(t) => setFilter((prev) => ({ ...prev, category: t }))}
        placeholder="Filter by category..."
        style={Platform.OS === 'web' ? webStyles.filterInput : styles.filterInput}
      />

      <Text style={Platform.OS === 'web' ? webStyles.filterSectionTitle : styles.filterSectionTitle}>Price Per Day</Text>
      <View style={styles.filterRow}>
        <TextInput
          value={filter.priceMin}
          onChangeText={(t) => setFilter((prev) => ({ ...prev, priceMin: t }))}
          placeholder="Min $"
          keyboardType="decimal-pad"
          style={Platform.OS === 'web' ? webStyles.filterInput : styles.filterInput}
        />
        <TextInput
          value={filter.priceMax}
          onChangeText={(t) => setFilter((prev) => ({ ...prev, priceMax: t }))}
          placeholder="Max $"
          keyboardType="decimal-pad"
          style={Platform.OS === 'web' ? webStyles.filterInput : styles.filterInput}
        />
      </View>

      <Text style={Platform.OS === 'web' ? webStyles.filterSectionTitle : styles.filterSectionTitle}>Available Date</Text>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={Platform.OS === 'web' ? webStyles.dateFilterBtn : styles.dateFilterBtn}
          onPress={() => setShowDateFromPicker(true)}
        >
          <Text style={Platform.OS === 'web' ? webStyles.dateFilterText : styles.dateFilterText}>
            From: {filter.availableDateFrom?.toLocaleDateString() ?? 'Any'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={Platform.OS === 'web' ? webStyles.dateFilterBtn : styles.dateFilterBtn}
          onPress={() => setShowDateToPicker(true)}
        >
          <Text style={Platform.OS === 'web' ? webStyles.dateFilterText : styles.dateFilterText}>
            To: {filter.availableDateTo?.toLocaleDateString() ?? 'Any'}
          </Text>
        </TouchableOpacity>
      </View>
      {showDateFromPicker && (
        <View style={styles.datePickerWrap}>
          <DateTimePicker
            value={filter.availableDateFrom ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => {
              setShowDateFromPicker(Platform.OS === 'ios');
              setFilter((prev) => ({ ...prev, availableDateFrom: d ?? null }));
            }}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity onPress={() => setShowDateFromPicker(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {showDateToPicker && (
        <View style={styles.datePickerWrap}>
          <DateTimePicker
            value={filter.availableDateTo ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => {
              setShowDateToPicker(Platform.OS === 'ios');
              setFilter((prev) => ({ ...prev, availableDateTo: d ?? null }));
            }}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity onPress={() => setShowDateToPicker(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={Platform.OS === 'web' ? webStyles.filterSectionTitle : styles.filterSectionTitle}>Renter</Text>
      <TextInput
        value={filter.renter}
        onChangeText={(t) => setFilter((prev) => ({ ...prev, renter: t }))}
        placeholder="Search renter..."
        style={Platform.OS === 'web' ? webStyles.filterInput : styles.filterInput}
      />

      <Text style={Platform.OS === 'web' ? webStyles.filterSectionTitle : styles.filterSectionTitle}>Location Radius</Text>
      <View style={styles.locationFilterRow}>
        <TextInput
          value={filter.locationZip}
          onChangeText={(t) => setFilter((prev) => ({ ...prev, locationZip: t }))}
          placeholder="ZIP code"
          keyboardType="number-pad"
          maxLength={10}
          style={[Platform.OS === 'web' ? webStyles.filterInput : styles.filterInput, styles.zipInput]}
        />
        <TouchableOpacity
          style={Platform.OS === 'web' ? webStyles.useLocationBtn : styles.useLocationBtn}
          onPress={fetchCurrentLocationForFilter}
          disabled={locationLoading}
        >
          <Text style={Platform.OS === 'web' ? webStyles.useLocationBtnText : styles.useLocationBtnText}>
            {locationLoading ? 'Getting...' : 'Use my location'}
          </Text>
        </TouchableOpacity>
      </View>
      {filter.locationZip.trim() && (
        <TouchableOpacity style={Platform.OS === 'web' ? webStyles.applyZipBtn : styles.applyZipBtn} onPress={applyZipForFilter}>
          <Text style={Platform.OS === 'web' ? webStyles.applyZipBtnText : styles.applyZipBtnText}>Apply ZIP</Text>
        </TouchableOpacity>
      )}
      {filter.locationCenter && (
        <>
          <Text style={Platform.OS === 'web' ? webStyles.locationCenterText : styles.locationCenterText}>
            Center: {filter.locationCenter.latitude.toFixed(3)}, {filter.locationCenter.longitude.toFixed(3)}
          </Text>
          <Text style={Platform.OS === 'web' ? webStyles.filterSectionTitle : styles.filterSectionTitle}>Radius (miles)</Text>
          <View style={styles.radiusRow}>
            {RADIUS_OPTIONS.map((miles) => (
              <TouchableOpacity
                key={miles}
                style={[
                  Platform.OS === 'web' ? webStyles.radiusChip : styles.radiusChip,
                  filter.radiusMiles === miles && (Platform.OS === 'web' ? webStyles.radiusChipSelected : styles.radiusChipSelected),
                ]}
                onPress={() => setFilter((prev) => ({ ...prev, radiusMiles: miles }))}
              >
                <Text
                  style={[
                    Platform.OS === 'web' ? webStyles.radiusChipText : styles.radiusChipText,
                    filter.radiusMiles === miles && (Platform.OS === 'web' ? webStyles.radiusChipTextSelected : styles.radiusChipTextSelected),
                  ]}
                >
                  {miles} mi
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.clearLocationBtn}
            onPress={() =>
              setFilter((prev) => ({
                ...prev,
                locationCenter: null,
                radiusMiles: null,
                locationZip: '',
              }))
            }
          >
            <Text style={styles.clearLocationText}>Clear location filter</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={Platform.OS === 'web' ? webStyles.filterSectionTitle : styles.filterSectionTitle}>Attributes</Text>
      {filter.attributeFilters.map((f, i) => (
        <View key={i} style={styles.customFilterRow}>
          <Text style={styles.customFilterText}>{f.key}: {f.value || '(any)'}</Text>
          <TouchableOpacity onPress={() => removeAttributeFilter(i)}>
            <Text style={styles.removeFilterText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}
      <View style={styles.addFilterRow}>
        <TextInput
          value={newAttrKey}
          onChangeText={setNewAttrKey}
          placeholder="Attribute name"
          style={[Platform.OS === 'web' ? webStyles.filterInput : styles.filterInput, styles.addFilterInput]}
        />
        <TextInput
          value={newAttrValue}
          onChangeText={setNewAttrValue}
          placeholder="Value (partial match)"
          style={[Platform.OS === 'web' ? webStyles.filterInput : styles.filterInput, styles.addFilterInput]}
        />
        <TouchableOpacity style={Platform.OS === 'web' ? webStyles.addFilterBtn : styles.addFilterBtn} onPress={addAttributeFilter}>
          <Text style={styles.addFilterBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={Platform.OS === 'web' ? webStyles.clearFiltersBtn : styles.clearFiltersBtn} onPress={clearFilters}>
        <Text style={styles.clearFiltersText}>Clear all filters</Text>
      </TouchableOpacity>
    </View>
  );

  const renderListItem = (item: ItemListing) => (
    <TouchableOpacity
      key={item.id}
      onPress={() => navigation.navigate('Details', { item })}
      style={Platform.OS === 'web' ? webStyles.listItem : styles.listItem}
    >
      {item.images?.[0] ? (
        <Image source={{ uri: item.images[0] }} style={Platform.OS === 'web' ? webStyles.listItemImage : styles.listItemImage} />
      ) : (
        <View style={Platform.OS === 'web' ? webStyles.listItemImagePlaceholder : styles.listItemImagePlaceholder} />
      )}
      <View style={Platform.OS === 'web' ? webStyles.listItemContent : styles.listItemContent}>
        <Text style={Platform.OS === 'web' ? webStyles.listItemText : styles.listItemText}>{getItemDisplayName(item)}</Text>
        <Text style={Platform.OS === 'web' ? webStyles.listItemSubText : styles.listItemSubText}>{item.category}</Text>
        <Text style={Platform.OS === 'web' ? webStyles.listItemSubText : styles.listItemSubText}>{formatPrice(item)} / day</Text>
        <Text style={Platform.OS === 'web' ? webStyles.listItemSubText : styles.listItemSubText}>Available: {formatDate(item)}</Text>
        {item.attributes?.renter && (
          <Text style={Platform.OS === 'web' ? webStyles.listItemSubText : styles.listItemSubText}>Renter: {String(item.attributes.renter)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={webStyles.page}>
        <View style={webStyles.navBar}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Text style={webStyles.logo}>MGAB Rentals</Text>
          </TouchableOpacity>
          <View style={webStyles.navLinks}>
            <Text style={webStyles.navLinkActive}>Browse</Text>
            <TouchableOpacity
              style={webStyles.navLink}
              onPress={() => navigation.navigate('AddItem')}
            >
              <Text style={webStyles.navLinkText}>Add Item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={webStyles.navLink}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={webStyles.navLinkText}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={webStyles.main}>
          <View style={[webStyles.sidebar, webFiltersCollapsed && webStyles.sidebarCollapsed]}>
            <TouchableOpacity
              style={[webStyles.sidebarHeader, webFiltersCollapsed && webStyles.sidebarHeaderCollapsed]}
              onPress={() => setWebFiltersCollapsed(!webFiltersCollapsed)}
              activeOpacity={0.7}
            >
              {!webFiltersCollapsed && (
                <>
                  <Text style={webStyles.sidebarTitle}>Filters</Text>
                  {hasActiveFilters && (
                    <View style={webStyles.filterBadge}>
                      <Text style={webStyles.filterBadgeText}>Active</Text>
                    </View>
                  )}
                </>
              )}
              <Text style={[webStyles.sidebarChevron, webFiltersCollapsed && webStyles.sidebarChevronCollapsed]}>{webFiltersCollapsed ? '▶' : '◀'}</Text>
            </TouchableOpacity>
            {!webFiltersCollapsed && (
              <ScrollView style={webStyles.sidebarScroll} contentContainerStyle={webStyles.sidebarInner}>
                {renderFilterPanel()}
              </ScrollView>
            )}
          </View>

          <ScrollView style={webStyles.content} contentContainerStyle={webStyles.contentInner}>
            {error && (
              <View style={webStyles.errorRow}>
                <Text style={webStyles.errorText}>{error}</Text>
                <TouchableOpacity onPress={refreshItems}>
                  <Text style={webStyles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={webStyles.resultCount}>
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </Text>

            {loading ? (
              <View style={webStyles.loadingContainer}>
                <ActivityIndicator size="large" />
              </View>
            ) : (
              <View style={webStyles.grid}>
                {filteredItems.length === 0 ? (
                  <Text style={webStyles.emptyText}>
                    {hasActiveFilters ? 'No items match your filters.' : 'No items listed yet.'}
                  </Text>
                ) : (
                  filteredItems.map((item) => renderListItem(item))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/ATVDiscer.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Find something to rent</Text>
        </View>

        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterToggleText}>
            {showFilters ? 'Hide filters' : 'Show filters'}
          </Text>
          {hasActiveFilters && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>Active</Text>
            </View>
          )}
        </TouchableOpacity>

        {showFilters && renderFilterPanel()}

        {error && (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={refreshItems}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.resultCount}>
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Details', { item })}
                style={styles.listItem}
              >
                {item.images?.[0] ? (
                  <Image source={{ uri: item.images[0] }} style={styles.listItemImage} />
                ) : (
                  <View style={styles.listItemImagePlaceholder} />
                )}
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemText}>{getItemDisplayName(item)}</Text>
                  <Text style={styles.listItemSubText}>{item.category}</Text>
                  <Text style={styles.listItemSubText}>{formatPrice(item)} / day</Text>
                  <Text style={styles.listItemSubText}>Available: {formatDate(item)}</Text>
                  {item.attributes?.renter && (
                    <Text style={styles.listItemSubText}>Renter: {String(item.attributes.renter)}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {hasActiveFilters ? 'No items match your filters.' : 'No items listed yet.'}
              </Text>
            }
          />
        )}
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111827',
  },
  title: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '600',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  filterToggleText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  filterBadge: {
    marginLeft: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
  },
  filterPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  dateFilterBtn: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  datePickerWrap: {
    marginBottom: 8,
  },
  dateFilterText: {
    color: '#374151',
    fontSize: 14,
  },
  doneText: {
    color: '#3b82f6',
    fontSize: 16,
    marginTop: 4,
  },
  customFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    marginBottom: 6,
  },
  customFilterText: {
    fontSize: 14,
    color: '#374151',
  },
  removeFilterText: {
    color: '#ef4444',
    fontSize: 14,
  },
  addFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  addFilterInput: {
    minWidth: 100,
    flex: 1,
  },
  addFilterBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addFilterBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  clearFiltersBtn: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  clearFiltersText: {
    color: '#6b7280',
    fontSize: 14,
  },
  locationFilterRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  zipInput: {
    flex: 1,
    minWidth: 80,
  },
  useLocationBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  useLocationBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  applyZipBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#10b981',
    borderRadius: 6,
    marginTop: 4,
  },
  applyZipBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  locationCenterText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  radiusChipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  radiusChipText: {
    fontSize: 14,
    color: '#374151',
  },
  radiusChipTextSelected: {
    color: '#fff',
  },
  clearLocationBtn: {
    marginTop: 8,
  },
  clearLocationText: {
    color: '#6b7280',
    fontSize: 14,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  retryText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  resultCount: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  listItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  listItemImage: {
    width: 64,
    height: 64,
    borderRadius: 6,
  },
  listItemImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listItemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  listItemSubText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 24,
  },
});

const webStyles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f9fafb',
    minHeight: '100%',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  navLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navLinkText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  navLinkActive: {
    fontSize: 15,
    color: '#3b82f6',
    fontWeight: '600',
    paddingVertical: 8,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  sidebarCollapsed: {
    flex: 0,
    width: 56,
    minWidth: 56,
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarInner: {
    padding: 20,
    paddingBottom: 40,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 14,
  },
  sidebarHeaderCollapsed: {
    justifyContent: 'center',
  },
  sidebarChevron: {
    marginLeft: 'auto',
    fontSize: 12,
    color: '#6b7280',
  },
  sidebarChevronCollapsed: {
    marginLeft: 0,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  filterBadge: {
    marginLeft: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
  },
  filterPanel: {
    padding: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
  },
  filterInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  dateFilterBtn: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  dateFilterText: {
    color: '#374151',
    fontSize: 14,
  },
  useLocationBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  useLocationBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  applyZipBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#10b981',
    borderRadius: 6,
    marginTop: 4,
  },
  applyZipBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  locationCenterText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  radiusChipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  radiusChipText: {
    fontSize: 14,
    color: '#374151',
  },
  radiusChipTextSelected: {
    color: '#fff',
  },
  clearFiltersBtn: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addFilterBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 24,
    paddingBottom: 48,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  retryText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  resultCount: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  listItem: {
    flexDirection: 'column',
    width: 240,
    padding: 0,
    marginBottom: 0,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    overflow: 'hidden',
  },
  listItemImage: {
    width: '100%',
    height: 160,
    borderRadius: 0,
  },
  listItemImagePlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 0,
    backgroundColor: '#e5e7eb',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 0,
    padding: 12,
  },
  listItemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  listItemSubText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 24,
    width: '100%',
  },
});
