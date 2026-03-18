/** Matches item_listings table in Supabase */
export type ItemListingRow = {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  price_per_day: number;
  category: string;
  status: string;
  available_date: string | null; // timestamptz
  location: string | null; // PostgreSQL point as "(x,y)" where x=lng, y=lat
  images: string[];
  attributes: Record<string, unknown>;
  created_at: string;
};

/** Attributes stored in jsonb - extends base fields */
export type ItemListingAttributes = {
  renter?: string;
  [key: string]: unknown;
};

/** App-level item type (normalized from DB) */
export type ItemListing = {
  id: string;
  userId: string | null;
  title: string;
  description: string;
  pricePerDay: number;
  category: string;
  status: string;
  availableDate: string; // ISO timestamp (from available_date column)
  location: { latitude: number; longitude: number } | null;
  images: string[];
  attributes: ItemListingAttributes;
  createdAt: string;
};
