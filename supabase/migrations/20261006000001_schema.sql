-- Campus food delivery: core schema.
-- Money is stored as integer IQD. Localised text uses *_en / *_ar / *_ku columns.

create type public.user_role as enum ('customer', 'vendor', 'admin');
create type public.restaurant_status as enum ('open', 'busy', 'closed');
create type public.order_status as enum (
  'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'
);
create type public.discount_type as enum ('percent', 'fixed');

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users, created by trigger)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '' check (char_length(full_name) <= 80),
  phone text check (phone is null or phone ~ '^0[0-9]{10}$'),
  avatar_url text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role) where role <> 'customer';
create index profiles_email_idx on public.profiles (lower(email));

-- ---------------------------------------------------------------------------
-- Delivery locations (campus buildings)
-- ---------------------------------------------------------------------------
create table public.delivery_locations (
  id integer generated always as identity primary key,
  name_en text not null,
  name_ar text,
  name_ku text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Restaurants
-- ---------------------------------------------------------------------------
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name_en text not null check (char_length(name_en) between 1 and 80),
  name_ar text,
  name_ku text,
  description_en text,
  description_ar text,
  description_ku text,
  logo_url text,
  cover_url text,
  phone text,
  location text,
  opens_at time,
  closes_at time,
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  min_order integer not null default 0 check (min_order >= 0),
  prep_minutes integer not null default 20 check (prep_minutes between 0 and 240),
  status public.restaurant_status not null default 'open',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  rating_avg numeric(2, 1) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index restaurants_owner_idx on public.restaurants (owner_id);
create index restaurants_active_idx on public.restaurants (is_featured desc, rating_avg desc) where is_active;

-- ---------------------------------------------------------------------------
-- Menu: categories -> items -> option groups -> options
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name_en text not null check (char_length(name_en) between 1 and 60),
  name_ar text,
  name_ku text,
  note_en text,
  note_ar text,
  note_ku text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, restaurant_id)
);
create index categories_restaurant_idx on public.categories (restaurant_id, sort_order);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid,
  name_en text not null check (char_length(name_en) between 1 and 100),
  name_ar text,
  name_ku text,
  description_en text,
  description_ar text,
  description_ku text,
  price integer not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  prep_minutes integer check (prep_minutes is null or prep_minutes between 0 and 240),
  sort_order integer not null default 0,
  order_count integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- a category must belong to the same restaurant as the item
  foreign key (category_id, restaurant_id)
    references public.categories (id, restaurant_id) on delete set null (category_id)
);
create index menu_items_restaurant_idx on public.menu_items (restaurant_id, sort_order) where archived_at is null;
create index menu_items_category_idx on public.menu_items (category_id);
create index menu_items_popular_idx on public.menu_items (order_count desc) where archived_at is null and is_available;

create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.menu_items (id) on delete cascade,
  name_en text not null check (char_length(name_en) between 1 and 60),
  name_ar text,
  name_ku text,
  min_select integer not null default 0,
  max_select integer not null default 1,
  sort_order integer not null default 0,
  check (max_select >= 1 and min_select between 0 and max_select)
);
create index option_groups_item_idx on public.option_groups (item_id, sort_order);

create table public.options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.option_groups (id) on delete cascade,
  name_en text not null check (char_length(name_en) between 1 and 60),
  name_ar text,
  name_ku text,
  price_delta integer not null default 0 check (price_delta >= 0),
  is_available boolean not null default true,
  sort_order integer not null default 0
);
create index options_group_idx on public.options (group_id, sort_order);

-- ---------------------------------------------------------------------------
-- Promotions
-- ---------------------------------------------------------------------------
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants (id) on delete cascade, -- null = platform-wide
  code text not null unique check (code ~ '^[A-Z0-9]{3,20}$'),
  title_en text not null check (char_length(title_en) between 1 and 80),
  title_ar text,
  title_ku text,
  discount_type public.discount_type not null,
  value integer not null check (value > 0),
  min_subtotal integer not null default 0 check (min_subtotal >= 0),
  max_discount integer check (max_discount is null or max_discount > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_user_limit integer not null default 1 check (per_user_limit > 0),
  used_count integer not null default 0,
  is_active boolean not null default true,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percent' or value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index promotions_restaurant_idx on public.promotions (restaurant_id);

-- ---------------------------------------------------------------------------
-- Orders (written only through place_order / status functions).
-- Customers order as guests: no account, they identify an order by its id +
-- tracking_token (returned once when the order is placed).
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity (start with 1001) unique,
  tracking_token uuid not null default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  status public.order_status not null default 'pending',
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null check (delivery_fee >= 0),
  discount integer not null default 0 check (discount >= 0),
  total integer not null check (total >= 0),
  promotion_id uuid references public.promotions (id) on delete set null,
  promo_code text,
  customer_name text not null,
  customer_phone text not null,
  location_id integer references public.delivery_locations (id) on delete set null,
  location_label text not null,
  address_details text,
  comment text,
  payment_method text not null default 'cash',
  idempotency_key uuid not null unique,
  rating smallint check (rating is null or rating between 1 and 5),
  rated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal + delivery_fee - discount)
);
create index orders_phone_idx on public.orders (customer_phone, created_at desc);
create index orders_restaurant_idx on public.orders (restaurant_id, created_at desc);
create index orders_restaurant_open_idx on public.orders (restaurant_id, status)
  where status not in ('delivered', 'cancelled');
create index orders_promotion_idx on public.orders (promotion_id) where promotion_id is not null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  item_id uuid references public.menu_items (id) on delete set null,
  -- snapshot, so history survives menu edits and removals
  name_en text not null,
  name_ar text,
  name_ku text,
  image_url text,
  options jsonb not null default '[]',
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total integer not null check (line_total >= 0)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_item_idx on public.order_items (item_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);
