import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { OWNER_USER_ID } from '../auth/featureFlags';
import {
  Alert,
  Button,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useItems } from '../context/ItemsContext';
import type { ItemListing } from '../types/database';

type AppStackParamList = {
  Home: undefined;
  Listing: undefined;
  AddItem: undefined;
  Details: { item: ItemListing };
};

type Props = NativeStackScreenProps<AppStackParamList, 'AddItem'>;

const MAX_IMAGES = 5;
const CATEGORIES = ['Equipment', 'Vehicles', 'Electronics', 'Tools', 'Other'];

type CustomField = { key: string; value: string };

export const AddItemScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { addItem } = useItems();
  const isOwner = user?.id === OWNER_USER_ID;

  useEffect(() => {
    if (isOwner === false) {
      navigation.replace('Home');
    }
  }, [isOwner, navigation]);

  if (!isOwner) {
    return null;
  }
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerDay, setPricePerDay] = useState('');
  const [category, setCategory] = useState('');
  const [availableDate, setAvailableDate] = useState<Date>(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [renter, setRenter] = useState('');
  const [rentalLocation, setRentalLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied.');
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setRentalLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (e) {
      setLocationError('Could not get location.');
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit reached', `You can add up to ${MAX_IMAGES} images.`);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to add images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const newUris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...newUris].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addCustomField = () => {
    const key = newFieldKey.trim();
    if (!key) return;
    setCustomFields((prev) => [...prev, { key, value: newFieldValue.trim() }]);
    setNewFieldKey('');
    setNewFieldValue('');
  };

  const removeCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setError(null);
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const trimmedPrice = pricePerDay.trim();
    const trimmedCategory = category.trim();
    const trimmedRenter = renter.trim();

    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }
    if (!trimmedDesc) {
      setError('Description is required.');
      return;
    }
    if (!trimmedPrice) {
      setError('Price Per Day is required.');
      return;
    }
    const priceNum = parseFloat(trimmedPrice);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError('Please enter a valid price.');
      return;
    }
    if (!trimmedCategory) {
      setError('Category is required.');
      return;
    }

    const customFieldsObj = customFields.reduce(
      (acc, { key, value }) => {
        if (key.trim()) acc[key.trim()] = value;
        return acc;
      },
      {} as Record<string, string>
    );

    const attributes = {
      renter: trimmedRenter,
      ...customFieldsObj,
    };

    setSaving(true);
    try {
      await addItem({
        title: trimmedTitle,
        description: trimmedDesc,
        pricePerDay: priceNum,
        category: trimmedCategory,
        status: 'available',
        availableDate: availableDate.toISOString(),
        location: rentalLocation ?? undefined,
        images: [...images],
        attributes,
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>Required Fields</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title *"
            style={styles.input}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description *"
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textArea]}
          />
          <TextInput
            value={pricePerDay}
            onChangeText={setPricePerDay}
            placeholder="Price Per Day *"
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.categoryChip, category === c && styles.categoryChipSelected]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.categoryChipText, category === c && styles.categoryChipTextSelected]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="Or type custom category"
            style={styles.input}
          />

          <Text style={styles.sectionTitle}>Available Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {availableDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={availableDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) setAvailableDate(selectedDate);
                }}
              />
              {Platform.OS === 'ios' && (
                <Button
                  title="Done"
                  onPress={() => setShowDatePicker(false)}
                />
              )}
            </View>
          )}

          <TextInput
            value={renter}
            onChangeText={setRenter}
            placeholder="Renter"
            style={styles.input}
          />

          <Text style={styles.sectionTitle}>Rental Location</Text>
          <View style={styles.locationRow}>
            {locationLoading ? (
              <Text style={styles.locationText}>Getting your location...</Text>
            ) : locationError ? (
              <Text style={styles.locationErrorText}>{locationError}</Text>
            ) : rentalLocation ? (
              <Text style={styles.locationText}>
                {rentalLocation.latitude.toFixed(5)}, {rentalLocation.longitude.toFixed(5)}
              </Text>
            ) : null}
            <TouchableOpacity style={styles.refreshLocationBtn} onPress={fetchCurrentLocation}>
              <Text style={styles.refreshLocationText}>
                {rentalLocation ? 'Update' : 'Use current location'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Images (up to {MAX_IMAGES})</Text>
          <View style={styles.imageRow}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.thumbnail} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => removeImage(index)}
                >
                  <Text style={styles.removeImageText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < MAX_IMAGES && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <Text style={styles.addImageText}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.sectionTitle}>Custom Fields (attributes)</Text>
          {customFields.map((field, index) => (
            <View key={index} style={styles.customFieldRow}>
              <Text style={styles.customFieldText}>
                {field.key}: {field.value}
              </Text>
              <TouchableOpacity onPress={() => removeCustomField(index)}>
                <Text style={styles.removeFieldText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.addFieldRow}>
            <TextInput
              value={newFieldKey}
              onChangeText={setNewFieldKey}
              placeholder="Field name"
              style={[styles.input, styles.fieldInput]}
            />
            <TextInput
              value={newFieldValue}
              onChangeText={setNewFieldValue}
              placeholder="Field value"
              style={[styles.input, styles.fieldInput]}
            />
            <Button title="Add Field" onPress={addCustomField} />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.actionsRow}>
            <Button
              title={saving ? 'Saving...' : 'Save Item'}
              onPress={handleSave}
              disabled={saving}
            />
            <Button title="Cancel" onPress={() => navigation.goBack()} color="#6b7280" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  categoryChipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#374151',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  dateButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  datePickerContainer: {
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  locationErrorText: {
    fontSize: 14,
    color: '#b91c1c',
    flex: 1,
  },
  refreshLocationBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  refreshLocationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  imageWrapper: {
    position: 'relative',
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addImageBtn: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    color: '#6b7280',
    fontSize: 14,
  },
  customFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 8,
  },
  customFieldText: {
    fontSize: 14,
    color: '#374151',
  },
  removeFieldText: {
    color: '#ef4444',
    fontSize: 14,
  },
  addFieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldInput: {
    flex: 1,
    minWidth: 100,
  },
  errorText: {
    color: '#b91c1c',
    marginTop: 8,
  },
  actionsRow: {
    marginTop: 24,
    gap: 8,
  },
});
