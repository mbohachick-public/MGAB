import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import {
  cancelBooking,
  fetchUserBookings,
  getCancellationFeeDays,
  isWithinCancellationWindow,
  type UserBooking,
} from '../lib/rentalDates';
import type { ItemListing } from '../types/database';

type AppStackParamList = {
  Home: undefined;
  Listing: undefined;
  MyBookings: undefined;
  Details: { item: ItemListing };
  CancellationInvoice: {
    item: { id: string; title: string; pricePerDay: number };
    booking: UserBooking['booking'];
    feeAmount: number;
  };
};

type Props = NativeStackScreenProps<AppStackParamList, 'MyBookings'>;

function isValidUuid(s: string | undefined): boolean {
  if (!s) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(s);
}

export const MyBookingsScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    const uid = user?.id;
    if (!uid || !isValidUuid(uid)) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserBookings(uid);
      setBookings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleCancelRequest = (ub: UserBooking) => {
    const withinWindow = isWithinCancellationWindow(ub.booking.startDate);
    const feeDays = getCancellationFeeDays();
    const feeAmount = ub.item.pricePerDay * feeDays;

    if (withinWindow) {
      Alert.alert(
        'Cancel Booking',
        `Cancel your booking for "${ub.item.title}" (${new Date(ub.booking.startDate).toLocaleDateString()} - ${new Date(ub.booking.endDate).toLocaleDateString()})? This cancellation is free.`,
        [
          { text: 'Keep Booking', style: 'cancel' },
          { text: 'Cancel Booking', onPress: () => doCancel(ub.booking.id) },
        ]
      );
    } else {
      Alert.alert(
        'Cancellation Fee',
        `Your booking starts within 2 days. Cancellations outside the free window require a fee of 1 day rental (${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(feeAmount)}). Would you like to view the cancellation invoice?`,
        [
          { text: 'Keep Booking', style: 'cancel' },
          {
            text: 'View Invoice',
            onPress: () =>
              navigation.navigate('CancellationInvoice', {
                item: ub.item,
                booking: ub.booking,
                feeAmount,
              }),
          },
        ]
      );
    }
  };

  const doCancel = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      await cancelBooking(bookingId);
      await loadBookings();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Please sign in to view your bookings.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isValidUuid(user.id)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Bookings are linked to your account. Sign in with Auth0 to manage bookings.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backLink}>← Home</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadBookings}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>You have no bookings.</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('Listing')}
          >
            <Text style={styles.browseButtonText}>Browse Listings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {bookings.map((ub) => {
            const withinWindow = isWithinCancellationWindow(ub.booking.startDate);
            const startStr = new Date(ub.booking.startDate).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const endStr = new Date(ub.booking.endDate).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const priceStr = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(ub.item.pricePerDay);

            return (
              <View key={ub.booking.id} style={styles.bookingCard}>
                <Text style={styles.bookingTitle}>{ub.item.title}</Text>
                <Text style={styles.bookingDates}>
                  {startStr} – {endStr}
                </Text>
                <Text style={styles.bookingPrice}>{priceStr} / day</Text>
                <View style={styles.bookingActions}>
                  <TouchableOpacity
                    style={[styles.cancelButton, cancellingId === ub.booking.id && styles.buttonDisabled]}
                    onPress={() => handleCancelRequest(ub)}
                    disabled={!!cancellingId}
                  >
                    {cancellingId === ub.booking.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.cancelButtonText}>
                        {withinWindow ? 'Cancel (Free)' : 'Cancel (Fee Applies)'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  backLink: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 14,
    color: '#b91c1c',
  },
  retryText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  browseButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  bookingDates: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  bookingPrice: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 16,
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
