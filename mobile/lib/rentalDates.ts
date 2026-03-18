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
