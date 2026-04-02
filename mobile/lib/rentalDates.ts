import { supabase } from './supabase';
import type { RentalDate, RentalDateRow } from '../types/database';

function rowToRentalDate(row: RentalDateRow): RentalDate {
  return {
    id: row.id,
    itemListingId: row.item_listing_id,
    startDate: row.start_date,
    endDate: row.end_date,
    renterUserId: row.renter_user_id,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

/** Fetch rental dates that block availability (booked or blocked) */
export async function fetchBookedRentalDates(itemListingId: string): Promise<RentalDate[]> {
  const { data, error } = await supabase
    .from('rental_dates')
    .select('*')
    .eq('item_listing_id', itemListingId)
    .in('status', ['booked', 'blocked']);

  if (error) throw error;
  return (data ?? []).map((r) => rowToRentalDate(r as RentalDateRow));
}

/** Check if a date range overlaps any booked period. Returns true if available (no overlap). */
function datesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && endA > startB;
}

/** Check if the requested date range is available (no overlapping bookings) */
export async function checkDatesAvailable(
  itemListingId: string,
  startDate: string,
  endDate: string
): Promise<{ available: boolean; message?: string }> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end <= start) {
    return { available: false, message: 'End date must be after start date.' };
  }

  const booked = await fetchBookedRentalDates(itemListingId);
  for (const b of booked) {
    const bStart = new Date(b.startDate);
    const bEnd = new Date(b.endDate);
    if (datesOverlap(start, end, bStart, bEnd)) {
      return {
        available: false,
        message: `Dates overlap with existing booking (${bStart.toLocaleDateString()} - ${bEnd.toLocaleDateString()}).`,
      };
    }
  }
  return { available: true };
}

export type CreateRentalBookingInput = {
  itemListingId: string;
  startDate: string;
  endDate: string;
  renterUserId?: string | null;
  notes?: string | null;
};

/** Create a rental booking (inserts into rental_dates with status 'booked') */
export async function createRentalBooking(input: CreateRentalBookingInput): Promise<RentalDate> {
  const { available, message } = await checkDatesAvailable(
    input.itemListingId,
    input.startDate,
    input.endDate
  );
  if (!available) throw new Error(message);

  const { data, error } = await supabase
    .from('rental_dates')
    .insert({
      item_listing_id: input.itemListingId,
      start_date: input.startDate,
      end_date: input.endDate,
      renter_user_id: input.renterUserId ?? null,
      status: 'booked',
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToRentalDate(data as RentalDateRow);
}

const CANCELLATION_WINDOW_DAYS = 2;
const CANCELLATION_FEE_DAYS = 1;

/** Check if a booking is within the free cancellation window (2 days before start) */
export function isWithinCancellationWindow(startDate: string): boolean {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= CANCELLATION_WINDOW_DAYS;
}

/** Get cancellation fee (1 day of rental price) */
export function getCancellationFeeDays(): number {
  return CANCELLATION_FEE_DAYS;
}

export type UserBooking = {
  booking: RentalDate;
  item: { id: string; title: string; pricePerDay: number };
};

/** Fetch all bookings for a user (status = booked) */
export async function fetchUserBookings(renterUserId: string): Promise<UserBooking[]> {
  const { data: datesData, error: datesError } = await supabase
    .from('rental_dates')
    .select('*')
    .eq('renter_user_id', renterUserId)
    .eq('status', 'booked')
    .order('start_date', { ascending: true });

  if (datesError) throw datesError;
  if (!datesData?.length) return [];

  const itemIds = [...new Set((datesData as RentalDateRow[]).map((r) => r.item_listing_id))];
  const { data: itemsData, error: itemsError } = await supabase
    .from('item_listings')
    .select('id, title, price_per_day')
    .in('id', itemIds);

  if (itemsError) throw itemsError;
  const itemsMap = new Map(
    (itemsData ?? []).map((r: { id: string; title: string; price_per_day: number }) => [
      r.id,
      { id: r.id, title: r.title, pricePerDay: r.price_per_day },
    ])
  );

  return (datesData as RentalDateRow[]).map((r) => ({
    booking: rowToRentalDate(r),
    item: itemsMap.get(r.item_listing_id) ?? {
      id: r.item_listing_id,
      title: 'Unknown',
      pricePerDay: 0,
    },
  }));
}

/** Cancel a booking (set status to cancelled). Caller must verify ownership and cancellation rules. */
export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('rental_dates')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);

  if (error) throw error;
}
