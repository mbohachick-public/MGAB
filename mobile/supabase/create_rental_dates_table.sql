-- Table to track when an item is rented (booking/availability periods)
-- Run in Supabase Dashboard → SQL Editor

create table rental_dates (
  id uuid default gen_random_uuid() primary key,
  item_listing_id uuid not null references item_listings(id) on delete cascade,
  start_date timestamptz not null,
  end_date timestamptz not null,
  renter_user_id uuid references auth.users(id),
  status text default 'booked' check (status in ('booked', 'available', 'blocked', 'cancelled')),
  notes text,
  created_at timestamptz default now(),
  constraint valid_date_range check (end_date > start_date)
);

-- Index for fast lookups by item
create index idx_rental_dates_item_listing on rental_dates(item_listing_id);

-- Index for date range queries
create index idx_rental_dates_dates on rental_dates(start_date, end_date);

-- RLS policies
alter table rental_dates enable row level security;

create policy "Allow public read on rental_dates"
  on rental_dates for select using (true);

create policy "Allow public insert on rental_dates"
  on rental_dates for insert with check (true);

create policy "Allow public update on rental_dates"
  on rental_dates for update using (true);

create policy "Allow public delete on rental_dates"
  on rental_dates for delete using (true);
