-- RLS policies for item_listings
-- Run in Supabase Dashboard → SQL Editor if your table doesn't have policies yet

alter table item_listings enable row level security;

create policy "Allow public read on item_listings"
  on item_listings for select using (true);

create policy "Allow public insert on item_listings"
  on item_listings for insert with check (true);

create policy "Allow public update on item_listings"
  on item_listings for update using (true);

create policy "Allow public delete on item_listings"
  on item_listings for delete using (true);
