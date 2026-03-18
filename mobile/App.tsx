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


type AppStackParamList = {
  Home: undefined;
  Listing: undefined;
  AddItem: undefined;
  Details: { item: ItemListing };
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
        <View style={styles.centerContent}>
          <Text style={styles.detailsLabel}>Title</Text>
          <Text style={styles.detailsText}>{item.title}</Text>

          <Text style={styles.detailsLabel}>Description</Text>
          <Text style={styles.detailsText}>{item.description}</Text>

          <Text style={styles.detailsLabel}>Category</Text>
          <Text style={styles.detailsText}>{item.category}</Text>

          <Text style={styles.detailsLabel}>Price Per Day</Text>
          <Text style={styles.detailsText}>{formattedPrice}</Text>

          <Text style={styles.detailsLabel}>Status</Text>
          <Text style={styles.detailsText}>{item.status}</Text>

          <Text style={styles.detailsLabel}>Renter</Text>
          <Text style={styles.detailsText}>{String(item.attributes?.renter ?? 'N/A')}</Text>

          <Text style={styles.detailsLabel}>Available Date</Text>
          <Text style={styles.detailsText}>{formattedDate}</Text>

          {item.location && (
            <>
              <Text style={styles.detailsLabel}>Location</Text>
              <Text style={styles.detailsText}>
                {item.location.latitude.toFixed(5)}, {item.location.longitude.toFixed(5)}
              </Text>
            </>
          )}

          {hasCustomAttrs && (
            <>
              <Text style={styles.detailsLabel}>Attributes</Text>
              {Object.entries(customAttrs).map(([key, value]) => (
                <Text key={key} style={styles.detailsText}>
                  {key}: {String(value)}
                </Text>
              ))}
            </>
          )}

          {item.images && item.images.length > 0 && (
            <>
              <Text style={styles.detailsLabel}>Images</Text>
              {item.images.map((uri: string, i: number) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={styles.detailImage}
                  resizeMode="cover"
                />
              ))}
            </>
          )}
        </View>
        <View style={styles.actionsRow}>
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
    <AuthProvider>
      <ItemsProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </ItemsProvider>
    </AuthProvider>
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
  detailsLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  detailsText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
    paddingHorizontal: 16,
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
