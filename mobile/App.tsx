import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Button,
  Image,
  ImageBackground,
  Platform,
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
import { AUTH0_ENABLED, OWNER_USER_ID } from './auth/featureFlags';
import { ResponsiveContainer } from './components/ResponsiveContainer';
import { ItemsProvider } from './context/ItemsContext';
import type { ItemListing } from './types/database';
import { LoginScreen } from './screens/LoginScreen';
import { AddItemScreen } from './screens/AddItemScreen';
import { ListingScreen } from './screens/ListingScreen';
import { RentItemScreen } from './screens/RentItemScreen';
import { BookingInvoiceScreen } from './screens/BookingInvoiceScreen';
import { MyBookingsScreen } from './screens/MyBookingsScreen';
import { CancellationInvoiceScreen } from './screens/CancellationInvoiceScreen';
import type { RentalDate } from './types/database';

type AppStackParamList = {
  Home: undefined;
  Listing: undefined;
  AddItem: undefined;
  MyBookings: undefined;
  Details: { item: ItemListing };
  RentItem: { item: ItemListing };
  BookingInvoice: {
    item: ItemListing;
    booking: RentalDate;
    days: number;
    totalPrice: number;
  };
  CancellationInvoice: {
    item: { id: string; title: string; pricePerDay: number };
    booking: RentalDate;
    feeAmount: number;
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
  const { user } = useAuth();
  const isOwner = user?.id === OWNER_USER_ID;

  if (Platform.OS === 'web') {
    return (
      <View style={webStyles.page}>
        <View style={webStyles.navBar}>
          <Text style={webStyles.logo}>MGAB Rentals</Text>
          <View style={webStyles.navLinks}>
            <TouchableOpacity
              style={webStyles.navLink}
              onPress={() => navigation.navigate('Listing')}
            >
              <Text style={webStyles.navLinkText}>Browse</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity
                style={[webStyles.navLink, webStyles.navLinkPrimary]}
                onPress={() => navigation.navigate('AddItem')}
              >
                <Text style={webStyles.navLinkPrimaryText}>Add Item</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={webStyles.navLink}
              onPress={() => navigation.navigate('MyBookings')}
            >
              <Text style={webStyles.navLinkText}>My Bookings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={webStyles.navLink}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={webStyles.navLinkText}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={webStyles.hero}>
          <View style={webStyles.heroContent}>
            <Text style={webStyles.heroTitle}>Rent what you need.</Text>
            <Text style={webStyles.heroSubtitle}>
              Find equipment, gear, and more from people in your area. List your own items and start earning.
            </Text>
            <TouchableOpacity
              style={webStyles.heroCta}
              onPress={() => navigation.navigate('Listing')}
            >
              <Text style={webStyles.heroCtaText}>Browse Listings</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={webStyles.footer}>
          <Text style={webStyles.footerText}>© MGAB Rentals</Text>
        </View>
        <StatusBar style="auto" />
      </View>
    );
  }

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

          {isOwner && (
            <View style={styles.actionsRow}>
              <Button
                title="Add Item"
                onPress={() => navigation.navigate('AddItem')}
              />
            </View>
          )}
        </View>

        <StatusBar style="auto" />
      </SafeAreaView>
    </ImageBackground>
  );
};

const DetailsScreen: React.FC<DetailsScreenProps> = ({ route, navigation }) => {
  const { item } = route.params;
  const { user } = useAuth();
  const isOwner = user?.id === OWNER_USER_ID;

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

  if (Platform.OS === 'web') {
    return (
      <View style={webStyles.detailsPage}>
        <View style={webStyles.navBar}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Text style={webStyles.logo}>MGAB Rentals</Text>
          </TouchableOpacity>
          <View style={webStyles.navLinks}>
            <TouchableOpacity
              style={webStyles.navLink}
              onPress={() => navigation.navigate('Listing')}
            >
              <Text style={webStyles.navLinkText}>Browse</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity
                style={webStyles.navLink}
                onPress={() => navigation.navigate('AddItem')}
              >
                <Text style={webStyles.navLinkText}>Add Item</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={webStyles.navLink}
              onPress={() => navigation.navigate('MyBookings')}
            >
              <Text style={webStyles.navLinkText}>My Bookings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={webStyles.navLink}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={webStyles.navLinkText}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={webStyles.detailsContent} contentContainerStyle={webStyles.detailsContentInner}>
          <View style={webStyles.detailsMain}>
            <View style={webStyles.detailsGallery}>
              {item.images && item.images.length > 0 ? (
                item.images.map((uri: string, i: number) => (
                  <Image
                    key={i}
                    source={{ uri }}
                    style={webStyles.detailsGalleryImage}
                    resizeMode="cover"
                  />
                ))
              ) : (
                <View style={webStyles.detailsGalleryPlaceholder} />
              )}
            </View>

            <View style={webStyles.detailsInfo}>
              <Text style={webStyles.detailsTitle}>{item.title}</Text>
              <Text style={webStyles.detailsPrice}>{formattedPrice} / day</Text>
              <Text style={webStyles.detailsDescription}>{item.description}</Text>

              <View style={webStyles.detailsMeta}>
                <View style={webStyles.detailsMetaRow}>
                  <Text style={webStyles.detailsMetaLabel}>Category</Text>
                  <Text style={webStyles.detailsMetaValue}>{item.category}</Text>
                </View>
                <View style={webStyles.detailsMetaRow}>
                  <Text style={webStyles.detailsMetaLabel}>Status</Text>
                  <Text style={webStyles.detailsMetaValue}>{item.status}</Text>
                </View>
                <View style={webStyles.detailsMetaRow}>
                  <Text style={webStyles.detailsMetaLabel}>Renter</Text>
                  <Text style={webStyles.detailsMetaValue}>{String(item.attributes?.renter ?? 'N/A')}</Text>
                </View>
                <View style={webStyles.detailsMetaRow}>
                  <Text style={webStyles.detailsMetaLabel}>Available</Text>
                  <Text style={webStyles.detailsMetaValue}>{formattedDate}</Text>
                </View>
                {item.location && (
                  <View style={webStyles.detailsMetaRow}>
                    <Text style={webStyles.detailsMetaLabel}>Location</Text>
                    <Text style={webStyles.detailsMetaValue}>
                      {item.location.latitude.toFixed(5)}, {item.location.longitude.toFixed(5)}
                    </Text>
                  </View>
                )}
                {Object.entries(customAttrs).map(([key, value]) => (
                  <View key={key} style={webStyles.detailsMetaRow}>
                    <Text style={webStyles.detailsMetaLabel}>{key}</Text>
                    <Text style={webStyles.detailsMetaValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>

              <View style={webStyles.detailsActions}>
                <TouchableOpacity
                  style={webStyles.rentButton}
                  onPress={() => navigation.navigate('RentItem', { item })}
                >
                  <Text style={webStyles.rentButtonText}>Rent Item</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={webStyles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={webStyles.backButtonText}>Back to Browse</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

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
      <AppStack.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: 'My Bookings' }} />
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
      <AppStack.Screen
        name="CancellationInvoice"
        component={CancellationInvoiceScreen}
        options={{ title: 'Cancellation Fee' }}
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
          <ResponsiveContainer>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </ResponsiveContainer>
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

const webStyles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    gap: 16,
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
  navLinkPrimary: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  navLinkPrimaryText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#f9fafb',
  },
  heroContent: {
    maxWidth: 560,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 48,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 32,
  },
  heroCta: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  heroCtaText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  footer: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  detailsPage: {
    flex: 1,
    backgroundColor: '#f9fafb',
    minHeight: '100%',
  },
  detailsContent: {
    flex: 1,
  },
  detailsContentInner: {
    padding: 24,
    paddingBottom: 48,
  },
  detailsMain: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    maxWidth: 900,
    alignSelf: 'center',
  },
  detailsGallery: {
    width: 400,
    minWidth: 280,
    minHeight: 300,
  },
  detailsGalleryImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 8,
  },
  detailsGalleryPlaceholder: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  detailsInfo: {
    flex: 1,
    minWidth: 0,
  },
  detailsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  detailsPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 16,
  },
  detailsDescription: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 24,
  },
  detailsMeta: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailsMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailsMetaLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailsMetaValue: {
    fontSize: 14,
    color: '#111827',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  detailsActions: {
    gap: 12,
  },
  rentButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  rentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 15,
    color: '#6b7280',
  },
});
