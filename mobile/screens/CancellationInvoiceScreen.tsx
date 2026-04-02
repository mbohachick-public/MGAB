import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { cancelBooking } from '../lib/rentalDates';
import type { RentalDate } from '../types/database';

type AppStackParamList = {
  Home: undefined;
  MyBookings: undefined;
  CancellationInvoice: {
    item: { id: string; title: string; pricePerDay: number };
    booking: RentalDate;
    feeAmount: number;
  };
};

type Props = NativeStackScreenProps<AppStackParamList, 'CancellationInvoice'>;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildCancellationInvoiceHtml(params: {
  itemTitle: string;
  booking: RentalDate;
  feeAmount: number;
  feeFormatted: string;
  startFormatted: string;
  endFormatted: string;
}): string {
  const { itemTitle, booking, feeFormatted, startFormatted, endFormatted } = params;
  const bookingId = booking.id.slice(0, 8).toUpperCase();
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #111827; }
    h1 { font-size: 24px; margin: 0 0 4px 0; }
    .subtitle { color: #6b7280; margin-bottom: 24px; }
    .invoice-card { background: #fef2f2; border-radius: 8px; padding: 20px; margin-bottom: 16px; border: 1px solid #fecaca; }
    .invoice-label { font-size: 11px; font-weight: 600; color: #6b7280; letter-spacing: 1px; margin-bottom: 4px; }
    .booking-id { font-size: 14px; font-family: monospace; color: #374151; margin-bottom: 16px; }
    .divider { height: 1px; background: #e5e7eb; margin: 12px 0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .row-label { color: #6b7280; font-size: 14px; }
    .row-value { color: #111827; font-size: 14px; text-align: right; }
    .total-row { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 2px solid #e5e7eb; font-weight: 700; }
    .total-value { font-size: 18px; color: #dc2626; }
    .status { color: #dc2626; font-weight: 600; text-align: center; margin-top: 16px; }
  </style>
</head>
<body>
  <h1>Cancellation Invoice</h1>
  <p class="subtitle">Cancellation fee (1 day rental) – outside free cancellation window</p>
  <div class="invoice-card">
    <div class="invoice-label">CANCELLATION INVOICE</div>
    <div class="booking-id">#${bookingId}</div>
    <div class="divider"></div>
    <div class="row"><span class="row-label">Item</span><span class="row-value">${escapeHtml(itemTitle)}</span></div>
    <div class="row"><span class="row-label">Original Start</span><span class="row-value">${escapeHtml(startFormatted)}</span></div>
    <div class="row"><span class="row-label">Original End</span><span class="row-value">${escapeHtml(endFormatted)}</span></div>
    <div class="divider"></div>
    <div class="row"><span class="row-label">Cancellation Fee (1 day)</span><span class="row-value">${feeFormatted}</span></div>
    <div class="total-row"><span class="row-label">Amount Due</span><span class="total-value">${feeFormatted}</span></div>
  </div>
  <p class="status">Status: Cancellation Fee Due</p>
</body>
</html>
`;
}

export const CancellationInvoiceScreen: React.FC<Props> = ({ route, navigation }) => {
  const { item, booking, feeAmount } = route.params;
  const [downloading, setDownloading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const startFormatted = new Date(booking.startDate).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const endFormatted = new Date(booking.endDate).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const feeFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(feeAmount);

  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const html = buildCancellationInvoiceHtml({
        itemTitle: item.title,
        booking,
        feeAmount,
        feeFormatted,
        startFormatted,
        endFormatted,
      });

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.onafterprint = () => printWindow.close();
        } else {
          Alert.alert(
            'Print',
            'Please allow pop-ups and try again, or use Ctrl/Cmd+P to print this page.',
            [{ text: 'OK' }]
          );
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Cancellation Invoice',
          });
        } else {
          Alert.alert('Download', `Invoice saved to: ${uri}`, [{ text: 'OK' }]);
        }
      }
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Failed to generate PDF',
        [{ text: 'OK' }]
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleConfirmAndCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      await cancelBooking(booking.id);
      Alert.alert(
        'Booking Cancelled',
        'Your booking has been cancelled. The cancellation fee invoice has been generated.',
        [{ text: 'OK', onPress: () => navigation.navigate('MyBookings') }]
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Cancellation Fee</Text>
        <Text style={styles.subtitle}>
          Your booking is outside the free cancellation window (2 days before start). A fee of 1 day rental applies.
        </Text>

        <View style={styles.invoiceCard}>
          <Text style={styles.invoiceLabel}>CANCELLATION INVOICE</Text>
          <Text style={styles.bookingId}>#{booking.id.slice(0, 8).toUpperCase()}</Text>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Item</Text>
            <Text style={styles.rowValue}>{item.title}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Original Dates</Text>
            <Text style={styles.rowValue}>
              {startFormatted} – {endFormatted}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Cancellation Fee (1 day)</Text>
            <Text style={styles.totalValue}>{feeFormatted}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.downloadButton, downloading && styles.buttonDisabled]}
            onPress={handleDownloadPdf}
            disabled={downloading}
            activeOpacity={0.7}
          >
            {downloading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.downloadButtonText}>Download Invoice PDF</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, cancelling && styles.buttonDisabled]}
            onPress={handleConfirmAndCancel}
            disabled={cancelling}
            activeOpacity={0.7}
          >
            {cancelling ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm & Cancel Booking</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>Back to My Bookings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  invoiceCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  invoiceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bookingId: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#374151',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 0.4,
  },
  rowValue: {
    fontSize: 14,
    color: '#111827',
    flex: 0.6,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc2626',
  },
  actions: {
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  downloadButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#059669',
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  confirmButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#6b7280',
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
