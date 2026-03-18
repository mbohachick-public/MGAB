create table if not exists item_listings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  title text not null,
  description text not null,
  price_per_day numeric(10, 2) not null,
  category text not null,
  status text default 'available',
  location point,
  images text[],
  attributes jsonb default '{}',
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table item_listings enable row level security;

-- Allow public read access (adjust for your auth needs)
create policy "Allow public read access on items"
  on item_listings for select
  using (true);

-- Allow public insert (adjust for your auth needs)
create policy "Allow public insert on items"
  on item_listings for insert
  with check (true);

-- Allow public update (adjust for your auth needs)
create policy "Allow public update on items"
  on item_listings for update
  using (true);

-- Allow public delete (adjust for your auth needs)
create policy "Allow public delete on items"
  on item_listings for delete
  using (true);
