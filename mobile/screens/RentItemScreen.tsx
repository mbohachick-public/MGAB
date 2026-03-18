import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Calendar } from 'react-native-calendars';
import { ScrollView } from 'react-native-gesture-handler';
import { useAuth } from '../auth/AuthContext';
import type { ItemListing, RentalDate } from '../types/database';
import {
  checkDatesAvailable,
  createRentalBooking,
  fetchBookedRentalDates,
} from '../lib/rentalDates';

/** Extract a readable message from Supabase/Postgrest errors or standard Error */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(s: string | undefined): boolean {
  return !!s && UUID_REGEX.test(s);
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Get all date strings (YYYY-MM-DD) that fall within booked/blocked periods */
function getUnavailableDateStrings(
  booked: { startDate: string; endDate: string }[]
): Set<string> {
  const set = new Set<string>();
  for (const b of booked) {
    const start = new Date(b.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(b.endDate);
    end.setHours(0, 0, 0, 0);
    const cur = new Date(start);
    while (cur <= end) {
      set.add(toDateString(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return set;
}

/** Get all date strings between start and end (inclusive) */
function getDateRangeStrings(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endD = new Date(end);
  endD.setHours(0, 0, 0, 0);
  while (cur <= endD) {
    out.push(toDateString(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

type CalendarDragContextValue = {
  onDragStart: (dateString: string) => void;
  onDragUpdate: (translationX: number, translationY: number) => void;
  onDragEnd: () => void;
  unavailableSet: Set<string>;
};

const CalendarDragContext = createContext<CalendarDragContextValue | null>(null);

/** Approximate cell size for converting pan translation to days */
const CELL_SIZE = 38;

/** Custom day component that supports press-and-drag to select a date range */
const DraggableDay: React.FC<{
  date?: { dateString: string; day?: number };
  marking?: { disabled?: boolean; disableTouchEvent?: boolean };
  state?: string;
  theme?: Record<string, unknown>;
  children?: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
}> = (props) => {
  const ctx = useContext(CalendarDragContext);
  const { date, marking, state, theme, children } = props;
  const dateString = date?.dateString ?? '';
  const isDisabled = marking?.disabled || marking?.disableTouchEvent || state === 'disabled';
  const isUnavailable = ctx ? ctx.unavailableSet.has(dateString) : false;
  const isToday = state === 'today';

  const handleStart = useCallback(() => {
    if (ctx && !isDisabled && !isUnavailable) ctx.onDragStart(dateString);
  }, [ctx, dateString, isDisabled, isUnavailable]);

  const handleUpdate = useCallback(
    (tx: number, ty: number) => {
      if (ctx) ctx.onDragUpdate(tx, ty);
    },
    [ctx]
  );

  const handleEnd = useCallback(() => {
    if (ctx) ctx.onDragEnd();
  }, [ctx]);

  const panGesture = useMemo(() => {
    if (!ctx || isDisabled || isUnavailable) return Gesture.Pan();
    return Gesture.Pan()
      .onStart(handleStart)
      .onUpdate((e) => handleUpdate(e.translationX, e.translationY))
      .onEnd(handleEnd)
      .runOnJS(true);
  }, [ctx, isDisabled, isUnavailable, handleStart, handleUpdate, handleEnd]);

  const containerStyle: object[] = [
    styles.dayBase,
    isToday && styles.dayToday,
    marking?.color && { backgroundColor: marking.color },
    marking?.textColor && { color: marking.textColor },
  ];

  if (isDisabled || isUnavailable) {
    return (
      <View style={[styles.dayBase, styles.dayDisabled]}>
        <Text style={[styles.dayText, styles.dayTextDisabled]}>{children}</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View style={containerStyle}>
        <Text
          style={[
            styles.dayText,
            marking?.textColor && { color: marking.textColor },
          ]}
        >
          {children}
        </Text>
      </View>
    </GestureDetector>
  );
};

/** Extract a readable message from Supabase/Postgrest errors or standard Error */
function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    const err = e as { message: string; details?: string; hint?: string };
    let msg = err.message;
    if (err.details) msg += ` (${err.details})`;
    if (err.hint) msg += ` — ${err.hint}`;
    return msg;
  }
  return String(e);
}

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

type Props = NativeStackScreenProps<AppStackParamList, 'RentItem'>;

const RENTAL_AGREEMENT = `
RENTAL AGREEMENT

This Rental Agreement ("Agreement") is entered into between the Renter and the Owner for the rental of the item listed below.

1. RENTAL ITEM
The rental item details are as shown in the app listing.

2. RENTAL PERIOD
The rental period is from the Start Date to the End Date selected. The Renter must return the item by the end of the rental period.

3. RENTER RESPONSIBILITIES
- The Renter is responsible for the safe use and return of the item in the same condition as received.
- The Renter must report any damage or issues immediately.
- The Renter agrees to pay for any damage, loss, or excessive wear beyond normal use.

4. OWNER RESPONSIBILITIES
- The Owner will provide the item in good working condition.

5. LIABILITY
- The Renter assumes all liability for use of the item during the rental period.
- The Owner is not responsible for any injuries or damages arising from use of the item.

6. CANCELLATION
- Cancellation policies may apply. Contact the owner for details.

By signing below, you acknowledge that you have read, understood, and agree to be bound by this Rental Agreement.
`;

export const RentItemScreen: React.FC<Props> = ({ route, navigation }) => {
  const { item } = route.params;
  const { user } = useAuth();
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [bookedDates, setBookedDates] = useState<{ startDate: string; endDate: string }[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [webSelectionStep, setWebSelectionStep] = useState<'start' | 'end'>('start');
  const dragAnchorRef = useRef<string | null>(null);
  const [agreementSigned, setAgreementSigned] = useState(false);
  const [agreementScrolledToEnd, setAgreementScrolledToEnd] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalPrice = days > 0 ? days * item.pricePerDay : 0;

  const canSign = agreementScrolledToEnd;
  const canSubmit = agreementSigned && availabilityChecked && availabilityMessage === null;

  const unavailableSet = useMemo(
    () => getUnavailableDateStrings(bookedDates),
    [bookedDates]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchBookedRentalDates(item.id);
        if (!cancelled) setBookedDates(data);
      } catch {
        if (!cancelled) setBookedDates([]);
      } finally {
        if (!cancelled) setLoadingDates(false);
      }
    })();
    return () => { cancelled = true; };
  }, [item.id]);

  const runAvailabilityCheck = useCallback(async () => {
    setError(null);
    setAvailabilityMessage(null);
    try {
      const result = await checkDatesAvailable(
        item.id,
        startDate.toISOString(),
        endDate.toISOString()
      );
      setAvailabilityChecked(true);
      if (result.available) {
        setAvailabilityMessage(null);
      } else {
        setAvailabilityMessage(result.message ?? 'Dates are not available.');
      }
    } catch (e) {
      const msg = extractErrorMessage(e);
      setError(msg || 'Failed to check availability.');
    }
  }, [item.id, startDate, endDate]);

  useEffect(() => {
    if (!loadingDates && endDate >= startDate) {
      runAvailabilityCheck();
    }
  }, [loadingDates, startDate, endDate, runAvailabilityCheck]);

  const handleWebDayPress = useCallback(
    (day: { dateString: string }) => {
      const d = new Date(day.dateString);
      d.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) return;
      if (unavailableSet.has(day.dateString)) return;

      if (webSelectionStep === 'start') {
        setStartDate(d);
        setEndDate(d);
        setWebSelectionStep('end');
        setAvailabilityChecked(false);
        setAvailabilityMessage(null);
      } else {
        if (d < startDate) {
          setStartDate(d);
          setEndDate(d);
          setAvailabilityChecked(false);
          setAvailabilityMessage(null);
        } else {
          setEndDate(d);
          setWebSelectionStep('start');
          runAvailabilityCheck();
        }
      }
    },
    [webSelectionStep, startDate, unavailableSet, runAvailabilityCheck]
  );

  const onDragStart = useCallback((dateString: string) => {
    const d = new Date(dateString);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) return;
    dragAnchorRef.current = dateString;
    setStartDate(d);
    setEndDate(d);
    setAvailabilityChecked(false);
    setAvailabilityMessage(null);
  }, []);

  const onDragUpdate = useCallback((translationX: number, translationY: number) => {
    const anchorStr = dragAnchorRef.current;
    if (!anchorStr) return;
    const anchor = new Date(anchorStr);
    anchor.setHours(0, 0, 0, 0);
    const cols = Math.round(translationX / CELL_SIZE);
    const rows = Math.round(translationY / CELL_SIZE);
    const daysDelta = rows * 7 + cols;
    const current = new Date(anchor);
    current.setDate(current.getDate() + daysDelta);
    current.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (current < today) return;
    const start = anchor < current ? anchor : current;
    const end = anchor < current ? current : anchor;
    setStartDate(start);
    setEndDate(end);
  }, []);

  const onDragEnd = useCallback(() => {
    dragAnchorRef.current = null;
    runAvailabilityCheck();
  }, [runAvailabilityCheck]);

  const calendarDragContextValue = useMemo<CalendarDragContextValue>(
    () => ({
      onDragStart,
      onDragUpdate,
      onDragEnd,
      unavailableSet,
    }),
    [onDragStart, onDragUpdate, onDragEnd, unavailableSet]
  );

  const markedDates = useMemo(() => {
    const marked: Record<string, object> = {};
    for (const d of unavailableSet) {
      marked[d] = {
        disabled: true,
        disableTouchEvent: true,
        color: '#fecaca',
        textColor: '#991b1b',
      };
    }
    if (startDate.getTime() === endDate.getTime()) {
      const k = toDateString(startDate);
      if (!marked[k]) {
        marked[k] = {
          startingDay: true,
          endingDay: true,
          color: '#3b82f6',
          textColor: '#ffffff',
        };
      }
    } else {
      const range = getDateRangeStrings(startDate, endDate);
      range.forEach((k, i) => {
        if (marked[k]) return;
        marked[k] = {
          startingDay: i === 0,
          endingDay: i === range.length - 1,
          color: '#3b82f6',
          textColor: '#ffffff',
        };
      });
    }
    return marked;
  }, [unavailableSet, startDate, endDate]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const booking = await createRentalBooking({
        itemListingId: item.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        renterUserId: isValidUuid(user?.id) ? user!.id : null,
      });
      navigation.navigate('BookingInvoice', {
        item,
        booking,
        days,
        totalPrice,
      });
    } catch (e) {
      const msg = extractErrorMessage(e);
      setError(msg || 'Failed to complete booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Rental Dates</Text>
          <Text style={styles.calendarLegend}>
            Red = taken • Blue = your selection •{' '}
            {Platform.OS === 'web' ? 'Tap start date, then end date' : 'Press and drag across dates'}
          </Text>
          {loadingDates ? (
            <Text style={styles.loadingText}>Loading availability…</Text>
          ) : Platform.OS === 'web' ? (
            <Calendar
              minDate={toDateString(new Date())}
              markedDates={markedDates}
              markingType="period"
              onDayPress={handleWebDayPress}
              enableSwipeMonths={false}
              theme={{
                todayTextColor: '#3b82f6',
                selectedDayBackgroundColor: '#3b82f6',
                selectedDayTextColor: '#ffffff',
                arrowColor: '#3b82f6',
                monthTextColor: '#111827',
                textDayFontWeight: '400',
                textMonthFontWeight: '600',
              }}
              style={styles.calendar}
            />
          ) : (
            <CalendarDragContext.Provider value={calendarDragContextValue}>
              <Calendar
                minDate={toDateString(new Date())}
                markedDates={markedDates}
                markingType="period"
                dayComponent={DraggableDay}
                enableSwipeMonths={false}
                theme={{
                todayTextColor: '#3b82f6',
                selectedDayBackgroundColor: '#3b82f6',
                selectedDayTextColor: '#ffffff',
                arrowColor: '#3b82f6',
                monthTextColor: '#111827',
                textDayFontWeight: '400',
                textMonthFontWeight: '600',
              }}
                style={styles.calendar}
              />
            </CalendarDragContext.Provider>
          )}
          <View style={styles.selectedDatesRow}>
            <Text style={styles.selectedDatesText}>
              {startDate.toLocaleDateString()} – {endDate.toLocaleDateString()}
            </Text>
            <Button
              title="Change dates"
              onPress={() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                setStartDate(today);
                setEndDate(tomorrow);
                setWebSelectionStep('start');
                setAvailabilityChecked(false);
                setAvailabilityMessage(null);
              }}
            />
          </View>
          {availabilityChecked && (
            <Text
              style={[
                styles.availabilityText,
                availabilityMessage ? styles.availabilityError : styles.availabilityOk,
              ]}
            >
              {availabilityMessage ?? 'Dates are available.'}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rental Agreement</Text>
          <Text style={styles.agreementHint}>
            Scroll to the bottom to enable the signature.
          </Text>
          <ScrollView
            style={styles.agreementScroll}
            onScroll={(e) => {
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
              const isAtEnd =
                layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
              if (isAtEnd) setAgreementScrolledToEnd(true);
            }}
            scrollEventThrottle={16}
          >
            <Text style={styles.agreementText}>{RENTAL_AGREEMENT}</Text>
          </ScrollView>
          <TouchableOpacity
            style={[
              styles.checkboxRow,
              !canSign && styles.checkboxDisabled,
            ]}
            onPress={() => canSign && setAgreementSigned(!agreementSigned)}
            disabled={!canSign}
          >
            <View style={[styles.checkbox, agreementSigned && styles.checkboxChecked]}>
              {agreementSigned && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and agree to the rental agreement (digital signature)
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.summaryText}>
            {item.title} × {days} day{days !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.summaryText}>
            Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalPrice)}
          </Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          title={submitting ? 'Processing...' : 'Complete Booking'}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        />
        <Button title="Cancel" onPress={() => navigation.goBack()} color="#6b7280" />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  calendarLegend: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    paddingVertical: 24,
    textAlign: 'center',
  },
  calendar: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  selectedDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  selectedDatesText: {
    fontSize: 16,
    color: '#111827',
  },
  availabilityText: {
    marginTop: 8,
    fontSize: 14,
  },
  availabilityOk: {
    color: '#059669',
  },
  availabilityError: {
    color: '#b91c1c',
  },
  agreementHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  agreementScroll: {
    maxHeight: 200,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  agreementText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  summaryText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  errorText: {
    color: '#b91c1c',
    marginBottom: 8,
  },
  dayBase: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  dayDisabled: {
    backgroundColor: '#fecaca',
  },
  dayText: {
    fontSize: 16,
    color: '#111827',
  },
  dayTextDisabled: {
    color: '#991b1b',
  },
});
