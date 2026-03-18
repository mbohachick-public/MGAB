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
import type { ItemListing, RentalDate } from '../types/database';

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

type Props = NativeStackScreenProps<AppStackParamList, 'BookingInvoice'>;

function buildInvoiceHtml(params: {
  item: ItemListing;
  booking: RentalDate;
  days: number;
  totalPrice: number;
  startFormatted: string;
  endFormatted: string;
  pricePerDayFormatted: string;
  totalFormatted: string;
}): string {
  const {
    item,
    booking,
    days,
    totalPrice,
    startFormatted,
    endFormatted,
    pricePerDayFormatted,
    totalFormatted,
  } = params;
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
    .invoice-card { background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
    .invoice-label { font-size: 11px; font-weight: 600; color: #6b7280; letter-spacing: 1px; margin-bottom: 4px; }
    .booking-id { font-size: 14px; font-family: monospace; color: #374151; margin-bottom: 16px; }
    .divider { height: 1px; background: #e5e7eb; margin: 12px 0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .row-label { color: #6b7280; font-size: 14px; }
    .row-value { color: #111827; font-size: 14px; text-align: right; }
    .total-row { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 2px solid #e5e7eb; font-weight: 700; }
    .total-value { font-size: 18px; color: #059669; }
    .status { color: #059669; font-weight: 600; text-align: center; margin-top: 16px; }
  </style>
</head>
<body>
  <h1>Booking Confirmed</h1>
  <p class="subtitle">Thank you for your rental</p>
  <div class="invoice-card">
    <div class="invoice-label">INVOICE</div>
    <div class="booking-id">#${bookingId}</div>
    <div class="divider"></div>
    <div class="row"><span class="row-label">Item</span><span class="row-value">${escapeHtml(item.title)}</span></div>
    <div class="row"><span class="row-label">Category</span><span class="row-value">${escapeHtml(item.category)}</span></div>
    <div class="row"><span class="row-label">Start Date</span><span class="row-value">${escapeHtml(startFormatted)}</span></div>
    <div class="row"><span class="row-label">End Date</span><span class="row-value">${escapeHtml(endFormatted)}</span></div>
    <div class="row"><span class="row-label">Duration</span><span class="row-value">${days} day${days !== 1 ? 's' : ''}</span></div>
    <div class="divider"></div>
    <div class="row"><span class="row-label">Price per day</span><span class="row-value">${pricePerDayFormatted}</span></div>
    <div class="row"><span class="row-label">Subtotal</span><span class="row-value">${pricePerDayFormatted} × ${days} = ${totalFormatted}</span></div>
    <div class="total-row"><span class="row-label">Total</span><span class="total-value">${totalFormatted}</span></div>
  </div>
  <p class="status">Status: Confirmed</p>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const BookingInvoiceScreen: React.FC<Props> = ({ route, navigation }) => {
  const { item, booking, days, totalPrice } = route.params;
  const [downloading, setDownloading] = useState(false);

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
  const pricePerDayFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(item.pricePerDay);
  const totalFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalPrice);

  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const html = buildInvoiceHtml({
        item,
        booking,
        days,
        totalPrice,
        startFormatted,
        endFormatted,
        pricePerDayFormatted,
        totalFormatted,
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
            dialogTitle: 'Save Invoice',
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Booking Confirmed</Text>
        <Text style={styles.subtitle}>Thank you for your rental</Text>

        <View style={styles.invoiceCard}>
          <Text style={styles.invoiceLabel}>INVOICE</Text>
          <Text style={styles.bookingId}>#{booking.id.slice(0, 8).toUpperCase()}</Text>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Item</Text>
            <Text style={styles.rowValue}>{item.title}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Category</Text>
            <Text style={styles.rowValue}>{item.category}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Start Date</Text>
            <Text style={styles.rowValue}>{startFormatted}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>End Date</Text>
            <Text style={styles.rowValue}>{endFormatted}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Duration</Text>
            <Text style={styles.rowValue}>{days} day{days !== 1 ? 's' : ''}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Price per day</Text>
            <Text style={styles.rowValue}>{pricePerDayFormatted}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Subtotal</Text>
            <Text style={styles.rowValue}>
              {pricePerDayFormatted} × {days} = {totalFormatted}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{totalFormatted}</Text>
          </View>
        </View>

        <Text style={styles.status}>Status: Confirmed</Text>

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
              <Text style={styles.downloadButtonText}>Download PDF</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>Back to Home</Text>
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
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  invoiceCard: {
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
    color: '#059669',
  },
  status: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
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
    minWidth: 160,
    alignItems: 'center',
  },
  downloadButtonText: {
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
    backgroundColor: '#3b82f6',
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
