import { supabase } from './supabase';
import type { ItemListing, ItemListingRow } from '../types/database';

function rowToItem(row: ItemListingRow): ItemListing {
  let location: ItemListing['location'] = null;
  if (row.location) {
    const match = row.location.match(/\(([^,]+),([^)]+)\)/);
    if (match) {
      const lng = parseFloat(match[1].trim());
      const lat = parseFloat(match[2].trim());
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        location = { latitude: lat, longitude: lng };
      }
    }
  }
  const attrs = (row.attributes || {}) as ItemListing['attributes'];
  if (!location && attrs.latitude != null && attrs.longitude != null) {
    location = {
      latitude: Number(attrs.latitude),
      longitude: Number(attrs.longitude),
    };
  }
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    pricePerDay: row.price_per_day,
    category: row.category,
    status: row.status,
    availableDate: row.available_date ?? '',
    location,
    images: row.images ?? [],
    attributes: attrs,
    createdAt: row.created_at,
  };
}

export async function fetchItemListings(): Promise<ItemListing[]> {
  const { data, error } = await supabase
    .from('item_listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => rowToItem(r as ItemListingRow));
}

export type CreateItemListingInput = {
  userId?: string | null;
  title: string;
  description: string;
  pricePerDay: number;
  category: string;
  status?: string;
  availableDate: string; // ISO timestamp
  location?: { latitude: number; longitude: number } | null;
  images?: string[];
  attributes?: Record<string, unknown>;
};

export async function createItemListing(input: CreateItemListingInput): Promise<ItemListing> {
  const attrs = {
    ...(input.attributes ?? {}),
    ...(input.location != null
      ? { latitude: input.location.latitude, longitude: input.location.longitude }
      : {}),
  };

  const { data, error } = await supabase
    .from('item_listings')
    .insert({
      user_id: input.userId ?? null,
      title: input.title,
      description: input.description,
      price_per_day: input.pricePerDay,
      category: input.category,
      status: input.status ?? 'available',
      available_date: input.availableDate,
      location: null,
      images: input.images ?? [],
      attributes: attrs,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToItem(data as ItemListingRow);
}
