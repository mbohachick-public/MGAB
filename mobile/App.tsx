import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Button,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
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
import { LoginScreen } from './screens/LoginScreen';

type AppStackParamList = {
  Home: undefined;
  Details: { item: TodoItem };
};

type AuthStackParamList = {
  Login: undefined;
};

type HomeScreenProps = NativeStackScreenProps<AppStackParamList, 'Home'>;
type DetailsScreenProps = NativeStackScreenProps<AppStackParamList, 'Details'>;

type TodoItem = {
  id: string;
  name: string;
  description: string;
  dailyRate: string;
  availableDate: string;
};

const AppStack = createNativeStackNavigator<AppStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [availableDate, setAvailableDate] = useState('');
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    if (!name.trim()) {
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: name.trim(),
        description: description.trim(),
        dailyRate: dailyRate.trim(),
        availableDate: availableDate.trim(),
      },
    ]);

    setName('');
    setDescription('');
    setDailyRate('');
    setAvailableDate('');
  };

  const fetchExampleData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=5');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data: { id: number; title: string }[] = await response.json();
      setItems(
        data.map((d) => ({
          id: `remote-${d.id}`,
          name: d.title,
          description: '',
          dailyRate: '',
          availableDate: '',
        })),
      );
    } catch (e) {
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

        <View style={styles.form}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            style={styles.input}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            style={styles.input}
          />
          <TextInput
            value={dailyRate}
            onChangeText={setDailyRate}
            placeholder="Daily Rate"
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            value={availableDate}
            onChangeText={setAvailableDate}
            placeholder="Item Available Date"
            style={styles.input}
          />

          <View style={styles.actionsRow}>
            <Button title="Add" onPress={addItem} />
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Button title="Load from API" onPress={fetchExampleData} />
        </View>

        {loading && (
          <View style={styles.centerContent}>
            <ActivityIndicator size="small" />
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('Details', { item })
              }
              style={styles.listItem}
            >
              <Text style={styles.listItemText}>{item.name}</Text>
              {!!item.description && (
                <Text style={styles.listItemSubText}>{item.description}</Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.emptyText}>
                No items yet. Add one above or load from API.
              </Text>
            ) : null
          }
        />

        <StatusBar style="auto" />
      </SafeAreaView>
    </ImageBackground>
  );
};

const DetailsScreen: React.FC<DetailsScreenProps> = ({ route, navigation }) => {
  const { item } = route.params;

  const formattedRate =
    item.dailyRate && !Number.isNaN(Number(item.dailyRate))
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(Number(item.dailyRate))
      : item.dailyRate || 'N/A';

  const formattedDate = item.availableDate
    ? (() => {
        const parsed = new Date(item.availableDate);
        return Number.isNaN(parsed.getTime())
          ? item.availableDate
          : parsed.toLocaleDateString();
      })()
    : 'N/A';

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
          <Text style={styles.detailsLabel}>Name</Text>
          <Text style={styles.detailsText}>{item.name || 'N/A'}</Text>

          <Text style={styles.detailsLabel}>Description</Text>
          <Text style={styles.detailsText}>{item.description || 'N/A'}</Text>

          <Text style={styles.detailsLabel}>Daily Rate</Text>
          <Text style={styles.detailsText}>{formattedRate}</Text>

          <Text style={styles.detailsLabel}>Item Available Date</Text>
          <Text style={styles.detailsText}>{formattedDate}</Text>
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
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
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
  actionsRow: {
    paddingHorizontal: 16,
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
  form: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  listItemSubText: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
  },
});
