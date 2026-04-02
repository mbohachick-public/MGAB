# MGAB — Implemented specification

This document describes behavior **as implemented in the repository** (code and SQL under `mobile/`). It is not a roadmap.

---

## Product scope

Single **Expo (React Native + Web)** app (`mobile/`) for **browsing rental listings**, **adding listings (owner only)**, **booking date ranges**, **invoices / PDFs**, and **managing cancellations** with a **2-day free window** and **1-day fee** outside that window.

---

## Platforms and layout

| Area | Behavior |
|------|----------|
| **Targets** | iOS, Android, Web (`expo start --web`) |
| **Web shell** | `ResponsiveContainer`: max content width **800px**, centered on web; native is full width |
| **Navigation** | `@react-navigation/native` + native stack |

---

## Configuration (environment)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` (or `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`) | Supabase anon client |
| `EXPO_PUBLIC_ENABLE_AUTH0` | `'true'` → Auth0 flow; otherwise dev auth |
| `EXPO_PUBLIC_OWNER_USER_ID` | User id allowed to add items; default **`dev-user`** when unset |

---

## Authentication

| Mode | Implementation |
|------|----------------|
| **Auth0 off** | `auth/AuthContext.tsx`: fixed dev user `{ id: 'dev-user', username: 'Dev User' }`; sign-in/out no-ops |
| **Auth0 on** | `auth/AuthContext.auth0.tsx` (wired via app): Auth0 + SecureStore; user `id` = Auth0 `sub` |
| **Gate** | If `AUTH0_ENABLED`, unauthenticated users see **Login** stack only |

**Login UI:** username/password (resource-owner path) + Auth0 web auth option (`screens/LoginScreen.tsx`).

---

## Roles and access (app-level)

| Rule | Implementation |
|------|----------------|
| **List items** | Everyone (reads from Supabase) |
| **Add items** | Only when `user.id === OWNER_USER_ID` (nav hidden + `AddItemScreen` redirects if not owner) |
| **Book / cancel** | Any signed-in user in app; **My Bookings** requires a **UUID** `user.id` (Auth0); dev `dev-user` is not a valid DB UUID for `renter_user_id` |

**Note:** Supabase RLS for `item_listings` and `rental_dates` is still **public read/write** in the shipped SQL; enforcement of “owner only” for inserts is **client-side**, not DB policy tied to Auth0.

---

## Data model (as in repo)

**`item_listings`** (`supabase/migrations/20250317000000_create_items_table.sql`): `id`, `user_id`, `title`, `description`, `price_per_day`, `category`, `status`, `location` (point), `images[]`, `attributes` (jsonb), `created_at`. App types also expect **`available_date`** for listing display/filters (must exist in your live DB if you use that path).

**`rental_dates`** (`supabase/create_rental_dates_table.sql`): `item_listing_id`, `start_date`, `end_date`, `renter_user_id` (UUID, FK `auth.users`), `status` ∈ `booked | available | blocked | cancelled`, `notes`, `created_at`; constraint `end_date > start_date`.

---

## Screens and flows

| Screen | Spec |
|--------|------|
| **Home** | Web: nav (Browse, Add Item if owner, My Bookings, Home), hero, CTA to listings. Native: browse CTA, Add Item if owner |
| **Listing** | Loads items via `ItemsContext` / `fetchItemListings`. **Filters:** title, category, price min/max, available date range, renter string, location radius (ZIP / current location + radius chips), custom attribute key/value filters, clear all. **Web:** nav bar, **50/50** split filters vs grid, **collapsible** filter sidebar |
| **Details** | Images, title, price/day, description, meta (category, status, renter, available date, location, custom attrs). **Rent Item** + back. **Web:** dedicated `webStyles` layout in `App.tsx` |
| **Add Item** | Title, description, price/day, category, available date, renter label, location (permission), up to **5** images, custom fields, save to Supabase |
| **Rent Item** | Calendar from `react-native-calendars`; loads **booked + blocked** ranges; availability check before book. **Native:** press-and-drag range. **Web:** tap start then end. Rental agreement (scroll + sign). Creates row in `rental_dates` with `status: 'booked'`; `renter_user_id` set only if `user.id` is a valid UUID |
| **Booking invoice** | Confirmed booking summary; **PDF:** native `expo-print` + `expo-sharing`; web `window.open` + print |
| **My Bookings** | Lists `rental_dates` where `renter_user_id = user.id` and `status = 'booked'`, joined to item title/price |
| **Cancellation invoice** | If start is **less than 2 full days** from now: fee path — shows **1× daily rate** invoice, PDF same pattern as booking invoice, then **Confirm & Cancel** sets `status` to **`cancelled`**. If **≥ 2 days** before start: **free** cancel after confirm |

**Cancellation constants** (`lib/rentalDates.ts`): free window **2 days** before start; fee **1 day** of rental price.

---

## Business rules (bookings)

| Rule | Implementation |
|------|----------------|
| **Overlap** | New booking rejected if range overlaps any existing **`booked`** or **`blocked`** row for that item |
| **Cancel free** | `start_date - now ≥ 2` days (delta from milliseconds) |
| **Cancel with fee** | User directed to cancellation invoice; fee = **`pricePerDay × 1`**; booking still cancelled in DB after confirm (no separate payment integration) |

---

## Libraries (feature-relevant)

Supabase JS, Auth0 (optional), `@react-native-community/datetimepicker`, `expo-image-picker`, `expo-location`, `react-native-calendars`, `react-native-gesture-handler`, `expo-print`, `expo-sharing`, `expo-secure-store`, `react-native-auth0`.

---

## Out of scope / not implemented in code

- **Payment processing** (Stripe, etc.) — invoices are informational / PDF only
- **Supabase Auth** tied to Auth0 for RLS — policies are permissive in provided SQL
- **Email / notifications**
- **Server-side validation** of owner-only inserts beyond the app UI

---

*Last aligned with repository structure and `mobile/` sources.*
