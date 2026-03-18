import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Button,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AUTH0_ENABLED } from './auth/featureFlags';
import { ItemsProvider } from './context/ItemsContext';
import type { ItemListing } from './types/database';
import { LoginScreen } from './screens/LoginScreen';
import { AddItemScreen } from './screens/AddItemScreen';
import { ListingScreen } from './screens/ListingScreen';
import { RentItemScreen } from './screens/RentItemScreen';
import { BookingInvoiceScreen } from './screens/BookingInvoiceScreen';
import type { RentalDate } from './types/database';

type AppStackParamList = {
  Home: undefined;
  Listing: undefined;
  AddItem: undefined;
  Details: { item: ItemListing };
  RentItem: { item: ItemListing };
  BookingInvoice: {
    item: ItemListing;
    booking: RentalDate;
    days: number;
    totalPrice: number;
  };
};

type AuthStackParamList = {
  Login: undefined;
};

type HomeScreenProps = NativeStackScreenProps<AppStackParamList, 'Home'>;
type DetailsScreenProps = NativeStackScreenProps<AppStackParamList, 'Details'>;

const AppStack = createNativeStackNavigator<AppStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  return (
    <ImageBackground
      source={require('./assets/ATVDiscer.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Bohachicks first mobile app written by himself</Text>
        </View>

        <View style={styles.landingContent}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Listing')}
          >
            <Text style={styles.primaryButtonText}>Find something to rent</Text>
          </TouchableOpacity>

          <View style={styles.actionsRow}>
            <Button
              title="Add Item"
              onPress={() => navigation.navigate('AddItem')}
            />
          </View>
        </View>

        <StatusBar style="auto" />
      </SafeAreaView>
    </ImageBackground>
  );
};

const DetailsScreen: React.FC<DetailsScreenProps> = ({ route, navigation }) => {
  const { item } = route.params;

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(item.pricePerDay);

  const formattedDate = item.availableDate
    ? (() => {
        const parsed = new Date(item.availableDate);
        return Number.isNaN(parsed.getTime()) ? item.availableDate : parsed.toLocaleDateString();
      })()
    : 'N/A';

  const attrs = item.attributes ?? {};
  const { renter: _r, latitude: _lat, longitude: _lng, ...customAttrs } = attrs;
  const hasCustomAttrs = Object.keys(customAttrs).length > 0;

  return (
    <ImageBackground
      source={require('./assets/ATVDiscer.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Details</Text>
        </View>
        <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsContent}>
          <View style={styles.detailsTable}>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Title</Text>
              <Text style={styles.detailsValue}>{item.title}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Description</Text>
              <Text style={styles.detailsValue}>{item.description}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Category</Text>
              <Text style={styles.detailsValue}>{item.category}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Price Per Day</Text>
              <Text style={styles.detailsValue}>{formattedPrice}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Status</Text>
              <Text style={styles.detailsValue}>{item.status}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Renter</Text>
              <Text style={styles.detailsValue}>{String(item.attributes?.renter ?? 'N/A')}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Available Date</Text>
              <Text style={styles.detailsValue}>{formattedDate}</Text>
            </View>
            {item.location && (
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Location</Text>
                <Text style={styles.detailsValue}>
                  {item.location.latitude.toFixed(5)}, {item.location.longitude.toFixed(5)}
                </Text>
              </View>
            )}
            {Object.entries(customAttrs).map(([key, value]) => (
              <View key={key} style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>{key}</Text>
                <Text style={styles.detailsValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
          {item.images && item.images.length > 0 && (
            <View style={styles.detailsImagesSection}>
              <Text style={styles.detailsImagesLabel}>Images</Text>
              {item.images.map((uri: string, i: number) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={styles.detailImage}
                  resizeMode="cover"
                />
              ))}
            </View>
          )}
        </ScrollView>
        <View style={styles.actionsRow}>
          <Button
            title="Rent Item"
            onPress={() => navigation.navigate('RentItem', { item })}
          />
          <Button title="Go back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const AppStackNavigator: React.FC = () => {
  return (
    <AppStack.Navigator>
      <AppStack.Screen name="Home" component={HomeScreen} />
      <AppStack.Screen name="Listing" component={ListingScreen} options={{ title: 'Listings' }} />
      <AppStack.Screen name="AddItem" component={AddItemScreen} options={{ title: 'Add Item' }} />
      <AppStack.Screen name="Details" component={DetailsScreen} />
      <AppStack.Screen
        name="RentItem"
        component={RentItemScreen}
        options={{ title: 'Rent Item' }}
      />
      <AppStack.Screen
        name="BookingInvoice"
        component={BookingInvoiceScreen}
        options={{ title: 'Booking Invoice', headerBackVisible: false }}
      />
    </AppStack.Navigator>
  );
};

const AuthStackNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
    </AuthStack.Navigator>
  );
};

const RootNavigator: React.FC = () => {
  if (!AUTH0_ENABLED) {
    return <AppStackNavigator />;
  }

  const { user } = useAuth();
  return user ? <AppStackNavigator /> : <AuthStackNavigator />;
};

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ItemsProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </ItemsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
};

export default App;

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  landingContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  actionsRow: {
    paddingBottom: 8,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  listItem: {
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
  listItemText: {
    fontSize: 16,
    color: '#111827',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 16,
  },
  errorText: {
    color: '#b91c1c',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  detailsScroll: {
    flex: 1,
  },
  detailsContent: {
    padding: 16,
    paddingBottom: 24,
  },
  detailsTable: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailsLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    flex: 0.4,
  },
  detailsValue: {
    fontSize: 16,
    color: '#111827',
    flex: 0.6,
    textAlign: 'right',
  },
  detailsImagesSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  detailsImagesLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  detailImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginVertical: 4,
  },
  listItemSubText: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
  },
});
