-- Row Level Security and privileges.
-- Privileges are granted explicitly so the schema does not depend on project
-- defaults; RLS then narrows every table to the rows the caller may touch.

alter default privileges in schema public revoke execute on functions from public;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter table public.profiles enable row level security;
alter table public.delivery_locations enable row level security;
alter table public.restaurants enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.option_groups enable row level security;
alter table public.options enable row level security;
alter table public.promotions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

-- Helper functions used inside policies
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_backend() to anon, authenticated;
grant execute on function public.manages_restaurant(uuid) to anon, authenticated;
grant execute on function public.manages_item(uuid) to anon, authenticated;
grant execute on function public.manages_option_group(uuid) to anon, authenticated;
grant execute on function public.try_uuid(text) to anon, authenticated;
grant execute on function public.restaurant_is_open(public.restaurants) to anon, authenticated;

-- Guest ordering: no account needed. Each function validates its own input;
-- the tracking token is the credential for the three order functions.
grant execute on function public.preview_promo(jsonb, text, text) to anon, authenticated;
grant execute on function public.place_order(uuid, jsonb, text, text, integer, text, text, text) to anon, authenticated;
grant execute on function public.track_order(uuid, uuid) to anon, authenticated;
grant execute on function public.cancel_order(uuid, uuid) to anon, authenticated;
grant execute on function public.rate_order(uuid, uuid, integer) to anon, authenticated;

-- Staff RPCs (each checks that the caller manages the restaurant)
grant execute on function public.set_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.save_item_options(uuid, jsonb) to authenticated;
grant execute on function public.restaurant_stats(uuid) to authenticated;
-- not granted: cart_lines, item_unit_price, promo_discount, apply_order_status (internal)

-- ---------------------------------------------------------------------------
-- profiles: private. Own row or admin. Rows are created by trigger only.
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (full_name, phone, avatar_url, role) on public.profiles to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- delivery_locations: public read, admin write
-- ---------------------------------------------------------------------------
grant select on public.delivery_locations to anon, authenticated;
grant insert, update, delete on public.delivery_locations to authenticated;

create policy locations_select on public.delivery_locations for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy locations_admin_insert on public.delivery_locations for insert to authenticated
  with check ((select public.is_admin()));
create policy locations_admin_update on public.delivery_locations for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy locations_admin_delete on public.delivery_locations for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- restaurants: public read of active ones; owner edits; admin creates/deletes
-- ---------------------------------------------------------------------------
grant select on public.restaurants to anon, authenticated;
grant insert, update, delete on public.restaurants to authenticated;

create policy restaurants_select on public.restaurants for select to anon, authenticated
  using (is_active or public.manages_restaurant(id));
create policy restaurants_insert on public.restaurants for insert to authenticated
  with check ((select public.is_admin()));
create policy restaurants_update on public.restaurants for update to authenticated
  using (public.manages_restaurant(id)) with check (public.manages_restaurant(id));
create policy restaurants_delete on public.restaurants for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- categories / menu_items / option_groups / options
-- ---------------------------------------------------------------------------
grant select on public.categories, public.menu_items, public.option_groups, public.options
  to anon, authenticated;
grant insert, update, delete on public.categories, public.option_groups, public.options to authenticated;
grant insert (restaurant_id, category_id, name_en, name_ar, name_ku, description_en, description_ar,
              description_ku, price, image_url, is_available, prep_minutes, sort_order),
      update (category_id, name_en, name_ar, name_ku, description_en, description_ar,
              description_ku, price, image_url, is_available, prep_minutes, sort_order, archived_at),
      delete
  on public.menu_items to authenticated;

create policy categories_select on public.categories for select to anon, authenticated
  using (
    (is_active and exists (select 1 from public.restaurants r where r.id = restaurant_id and r.is_active))
    or public.manages_restaurant(restaurant_id)
  );
create policy categories_insert on public.categories for insert to authenticated
  with check (public.manages_restaurant(restaurant_id));
create policy categories_update on public.categories for update to authenticated
  using (public.manages_restaurant(restaurant_id)) with check (public.manages_restaurant(restaurant_id));
create policy categories_delete on public.categories for delete to authenticated
  using (public.manages_restaurant(restaurant_id));

create policy menu_items_select on public.menu_items for select to anon, authenticated
  using (
    (archived_at is null and exists (select 1 from public.restaurants r where r.id = restaurant_id and r.is_active))
    or public.manages_restaurant(restaurant_id)
  );
create policy menu_items_insert on public.menu_items for insert to authenticated
  with check (public.manages_restaurant(restaurant_id));
create policy menu_items_update on public.menu_items for update to authenticated
  using (public.manages_restaurant(restaurant_id)) with check (public.manages_restaurant(restaurant_id));
create policy menu_items_delete on public.menu_items for delete to authenticated
  using (public.manages_restaurant(restaurant_id));

create policy option_groups_select on public.option_groups for select to anon, authenticated using (true);
create policy option_groups_insert on public.option_groups for insert to authenticated
  with check (public.manages_item(item_id));
create policy option_groups_update on public.option_groups for update to authenticated
  using (public.manages_item(item_id)) with check (public.manages_item(item_id));
create policy option_groups_delete on public.option_groups for delete to authenticated
  using (public.manages_item(item_id));

create policy options_select on public.options for select to anon, authenticated using (true);
create policy options_insert on public.options for insert to authenticated
  with check (public.manages_option_group(group_id));
create policy options_update on public.options for update to authenticated
  using (public.manages_option_group(group_id)) with check (public.manages_option_group(group_id));
create policy options_delete on public.options for delete to authenticated
  using (public.manages_option_group(group_id));

-- ---------------------------------------------------------------------------
-- promotions: live public promos are visible to all; private codes only work
-- through preview_promo()/place_order(). used_count is not client-writable.
-- ---------------------------------------------------------------------------
grant select on public.promotions to anon, authenticated;
grant insert (restaurant_id, code, title_en, title_ar, title_ku, discount_type, value, min_subtotal,
              max_discount, starts_at, ends_at, usage_limit, per_user_limit, is_active, is_public),
      update (code, title_en, title_ar, title_ku, discount_type, value, min_subtotal,
              max_discount, starts_at, ends_at, usage_limit, per_user_limit, is_active, is_public),
      delete
  on public.promotions to authenticated;

create policy promotions_select on public.promotions for select to anon, authenticated
  using (
    (is_active and is_public
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now()))
    or (restaurant_id is not null and public.manages_restaurant(restaurant_id))
    or (select public.is_admin())
  );
create policy promotions_insert on public.promotions for insert to authenticated
  with check (
    (restaurant_id is not null and public.manages_restaurant(restaurant_id)) or (select public.is_admin())
  );
create policy promotions_update on public.promotions for update to authenticated
  using ((restaurant_id is not null and public.manages_restaurant(restaurant_id)) or (select public.is_admin()))
  with check ((restaurant_id is not null and public.manages_restaurant(restaurant_id)) or (select public.is_admin()));
create policy promotions_delete on public.promotions for delete to authenticated
  using ((restaurant_id is not null and public.manages_restaurant(restaurant_id)) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- orders: readable only by the restaurant's staff. Guests read their own
-- order through track_order(id, token). All writes go through functions.
-- ---------------------------------------------------------------------------
grant select on public.orders, public.order_items, public.order_events to authenticated;

create policy orders_select on public.orders for select to authenticated
  using (public.manages_restaurant(restaurant_id));
create policy order_items_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy order_events_select on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
