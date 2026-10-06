-- Triggers, authorisation helpers and the order RPCs.
-- Errors raised for the client use a stable UPPER_SNAKE code as the message.

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.restaurants for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.menu_items for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.promotions for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.orders for each row execute function public.set_updated_at();

create function public.try_uuid(p text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

-- ---------------------------------------------------------------------------
-- Authorisation helpers (security definer so policies can call them without
-- recursing into the RLS of the tables they read)
-- ---------------------------------------------------------------------------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;

create function public.manages_restaurant(p_restaurant uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and (
        p.role = 'admin'
        or (p.role = 'vendor' and exists (
          select 1 from public.restaurants r where r.id = p_restaurant and r.owner_id = p.id
        ))
      )
  );
$$;

create function public.manages_item(p_item uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.manages_restaurant(
    (select restaurant_id from public.menu_items where id = p_item)
  );
$$;

create function public.manages_option_group(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.manages_item((select item_id from public.option_groups where id = p_group));
$$;

-- True when running as a trusted role: the service role, direct DB access, or
-- inside one of the security definer functions below. API callers always run
-- as anon / authenticated.
create function public.is_backend() returns boolean
language sql stable set search_path = '' as $$
  select current_user not in ('anon', 'authenticated');
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_phone text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g');
begin
  -- role is never taken from user-supplied metadata
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80),
    case when v_phone ~ '^0[0-9]{10}$' then v_phone end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

create function public.protect_profile_columns() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role and not (public.is_admin() or public.is_backend()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger protect_profile_columns before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------------
-- Restaurants: vendors may edit their restaurant but not ownership / listing
-- ---------------------------------------------------------------------------
create function public.protect_restaurant_columns() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.is_admin() or public.is_backend() then
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id
    or new.slug is distinct from old.slug
    or new.is_active is distinct from old.is_active
    or new.is_featured is distinct from old.is_featured
    or new.rating_avg is distinct from old.rating_avg
    or new.rating_count is distinct from old.rating_count then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger protect_restaurant_columns before update on public.restaurants
  for each row execute function public.protect_restaurant_columns();

-- Opening hours are in campus local time.
create function public.restaurant_is_open(r public.restaurants) returns boolean
language sql stable set search_path = '' as $$
  select r.is_active
    and r.status <> 'closed'
    and (
      r.opens_at is null or r.closes_at is null or r.opens_at = r.closes_at
      or case
        when r.opens_at < r.closes_at
          then (now() at time zone 'Asia/Baghdad')::time >= r.opens_at
           and (now() at time zone 'Asia/Baghdad')::time < r.closes_at
        else (now() at time zone 'Asia/Baghdad')::time >= r.opens_at
          or (now() at time zone 'Asia/Baghdad')::time < r.closes_at
      end
    );
$$;

-- ---------------------------------------------------------------------------
-- Menu options: save all groups + options of an item in one transaction.
-- Security invoker: RLS decides whether the caller may touch this item.
-- p_groups: [{id?, name_en, name_ar, name_ku, min_select, max_select,
--             options: [{id?, name_en, name_ar, name_ku, price_delta, is_available}]}]
-- ---------------------------------------------------------------------------
create function public.save_item_options(p_item uuid, p_groups jsonb) returns void
language plpgsql set search_path = '' as $$
declare
  g jsonb;
  o jsonb;
  g_pos integer := 0;
  o_pos integer;
  v_group uuid;
  v_keep_groups uuid[] := '{}';
  v_keep_options uuid[];
begin
  if not public.manages_item(p_item) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  for g in select * from jsonb_array_elements(coalesce(p_groups, '[]'::jsonb)) loop
    g_pos := g_pos + 1;
    v_group := public.try_uuid(g ->> 'id');

    if v_group is not null and exists (
      select 1 from public.option_groups where id = v_group and item_id = p_item
    ) then
      update public.option_groups set
        name_en = g ->> 'name_en',
        name_ar = nullif(g ->> 'name_ar', ''),
        name_ku = nullif(g ->> 'name_ku', ''),
        min_select = coalesce((g ->> 'min_select')::integer, 0),
        max_select = coalesce((g ->> 'max_select')::integer, 1),
        sort_order = g_pos
      where id = v_group;
    else
      insert into public.option_groups (item_id, name_en, name_ar, name_ku, min_select, max_select, sort_order)
      values (
        p_item, g ->> 'name_en', nullif(g ->> 'name_ar', ''), nullif(g ->> 'name_ku', ''),
        coalesce((g ->> 'min_select')::integer, 0), coalesce((g ->> 'max_select')::integer, 1), g_pos
      )
      returning id into v_group;
    end if;
    v_keep_groups := v_keep_groups || v_group;

    o_pos := 0;
    v_keep_options := '{}';
    for o in select * from jsonb_array_elements(coalesce(g -> 'options', '[]'::jsonb)) loop
      o_pos := o_pos + 1;
      if public.try_uuid(o ->> 'id') is not null and exists (
        select 1 from public.options where id = (o ->> 'id')::uuid and group_id = v_group
      ) then
        update public.options set
          name_en = o ->> 'name_en',
          name_ar = nullif(o ->> 'name_ar', ''),
          name_ku = nullif(o ->> 'name_ku', ''),
          price_delta = coalesce((o ->> 'price_delta')::integer, 0),
          is_available = coalesce((o ->> 'is_available')::boolean, true),
          sort_order = o_pos
        where id = (o ->> 'id')::uuid;
        v_keep_options := v_keep_options || (o ->> 'id')::uuid;
      else
        with ins as (
          insert into public.options (group_id, name_en, name_ar, name_ku, price_delta, is_available, sort_order)
          values (
            v_group, o ->> 'name_en', nullif(o ->> 'name_ar', ''), nullif(o ->> 'name_ku', ''),
            coalesce((o ->> 'price_delta')::integer, 0), coalesce((o ->> 'is_available')::boolean, true), o_pos
          )
          returning id
        )
        select v_keep_options || id into v_keep_options from ins;
      end if;
    end loop;

    delete from public.options where group_id = v_group and id <> all (v_keep_options);
  end loop;

  delete from public.option_groups where item_id = p_item and id <> all (v_keep_groups);
end $$;

-- ---------------------------------------------------------------------------
-- Shared validation: resolve an item + chosen options to a unit price.
-- Raises ITEM_UNAVAILABLE / OPTIONS_INVALID.
-- ---------------------------------------------------------------------------
create function public.item_unit_price(p_item uuid, p_options uuid[]) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare
  v_item public.menu_items;
  v_extra integer;
  v_valid integer;
begin
  select * into v_item from public.menu_items where id = p_item;
  if not found or v_item.archived_at is not null or not v_item.is_available then
    raise exception 'ITEM_UNAVAILABLE' using detail = coalesce(v_item.name_en, '');
  end if;

  select count(*), coalesce(sum(o.price_delta), 0) into v_valid, v_extra
  from public.options o
  join public.option_groups g on g.id = o.group_id
  where o.id = any (p_options) and g.item_id = p_item and o.is_available;

  if v_valid <> coalesce(cardinality(p_options), 0) then
    raise exception 'OPTIONS_INVALID' using detail = v_item.name_en;
  end if;

  -- every group's min/max selection must be respected
  if exists (
    select 1
    from public.option_groups g
    left join public.options o on o.group_id = g.id and o.id = any (p_options)
    where g.item_id = p_item
    group by g.id, g.min_select, g.max_select
    having count(o.id) < g.min_select or count(o.id) > g.max_select
  ) then
    raise exception 'OPTIONS_INVALID' using detail = v_item.name_en;
  end if;

  return v_item.price + v_extra;
end $$;

-- ---------------------------------------------------------------------------
-- Guest cart: the browser keeps the cart and sends it as
--   [{"item_id": uuid, "option_ids": [uuid], "quantity": int}, ...]
-- Nothing in it is trusted: this resolves it against the live menu.
-- Raises CART_EMPTY / CART_INVALID / QUANTITY_INVALID / CART_OTHER_RESTAURANT /
-- ITEM_UNAVAILABLE / OPTIONS_INVALID.
-- ---------------------------------------------------------------------------
create function public.cart_lines(p_items jsonb)
returns table (item_id uuid, option_ids uuid[], quantity integer, unit_price integer, restaurant_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare
  e jsonb;
  v_item uuid;
  v_options uuid[];
  v_qty integer;
  v_restaurant uuid;
  v_first uuid;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'CART_EMPTY';
  end if;
  if jsonb_array_length(p_items) > 40 then
    raise exception 'CART_INVALID';
  end if;

  for e in select * from jsonb_array_elements(p_items) loop
    v_item := public.try_uuid(e ->> 'item_id');
    if v_item is null or jsonb_typeof(coalesce(e -> 'option_ids', '[]'::jsonb)) <> 'array' then
      raise exception 'CART_INVALID';
    end if;
    if coalesce(e ->> 'quantity', '') !~ '^[0-9]{1,2}$' or (e ->> 'quantity')::integer not between 1 and 50 then
      raise exception 'QUANTITY_INVALID';
    end if;
    v_qty := (e ->> 'quantity')::integer;

    select coalesce(array_agg(distinct public.try_uuid(x) order by public.try_uuid(x)), '{}') into v_options
    from jsonb_array_elements_text(coalesce(e -> 'option_ids', '[]'::jsonb)) x;
    if array_position(v_options, null) is not null then
      raise exception 'OPTIONS_INVALID';
    end if;

    select m.restaurant_id into v_restaurant
    from public.menu_items m
    join public.restaurants r on r.id = m.restaurant_id and r.is_active
    where m.id = v_item;
    if v_restaurant is null then
      raise exception 'ITEM_UNAVAILABLE';
    end if;
    v_first := coalesce(v_first, v_restaurant);
    if v_restaurant <> v_first then
      raise exception 'CART_OTHER_RESTAURANT';
    end if;

    item_id := v_item;
    option_ids := v_options;
    quantity := v_qty;
    unit_price := public.item_unit_price(v_item, v_options); -- validates availability + options
    restaurant_id := v_restaurant;
    return next;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Promotions ("per customer" is tracked by phone number, as there are no accounts)
-- ---------------------------------------------------------------------------
create function public.promo_discount(
  p_code text, p_restaurant uuid, p_subtotal integer, p_phone text, p_lock boolean default false
) returns table (promotion_id uuid, discount integer)
language plpgsql security definer set search_path = '' as $$
declare
  v public.promotions;
  v_used integer;
  v_discount integer;
begin
  if p_lock then
    select * into v from public.promotions where code = upper(trim(p_code)) for update;
  else
    select * into v from public.promotions where code = upper(trim(p_code));
  end if;

  if not found
    or not v.is_active
    or (v.restaurant_id is not null and v.restaurant_id <> p_restaurant)
    or (v.starts_at is not null and v.starts_at > now()) then
    raise exception 'PROMO_INVALID';
  end if;
  if v.ends_at is not null and v.ends_at <= now() then
    raise exception 'PROMO_EXPIRED';
  end if;
  if v.usage_limit is not null and v.used_count >= v.usage_limit then
    raise exception 'PROMO_USED_UP';
  end if;
  if p_subtotal < v.min_subtotal then
    raise exception 'PROMO_MIN_SUBTOTAL' using detail = v.min_subtotal::text;
  end if;

  if p_phone is not null then
    select count(*) into v_used
    from public.orders o
    where o.customer_phone = p_phone and o.promotion_id = v.id and o.status <> 'cancelled';
    if v_used >= v.per_user_limit then
      raise exception 'PROMO_ALREADY_USED';
    end if;
  end if;

  if v.discount_type = 'percent' then
    v_discount := round(p_subtotal * v.value / 100.0)::integer;
  else
    v_discount := v.value;
  end if;
  v_discount := least(v_discount, coalesce(v.max_discount, v_discount), p_subtotal);

  return query select v.id, v_discount;
end $$;

-- Preview a promo code against a cart (and phone number, once it is known).
create function public.preview_promo(p_items jsonb, p_code text, p_phone text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_restaurant uuid;
  v_subtotal integer;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_promo record;
begin
  select l.restaurant_id, sum(l.unit_price * l.quantity)::integer into v_restaurant, v_subtotal
  from public.cart_lines(p_items) l
  group by l.restaurant_id;

  select * into v_promo from public.promo_discount(
    p_code, v_restaurant, v_subtotal, case when v_phone ~ '^0[0-9]{10}$' then v_phone end
  );
  return jsonb_build_object('code', upper(trim(p_code)), 'discount', v_promo.discount);
end $$;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
-- Places an order for a guest. Every amount is computed here from the live
-- menu; the client only supplies item ids, quantities and delivery details.
-- Safe to retry with the same idempotency key. Returns the order id and the
-- tracking token the customer needs to follow the order.
create function public.place_order(
  p_idempotency_key uuid,
  p_items jsonb,
  p_name text,
  p_phone text,
  p_location_id integer,
  p_details text default null,
  p_comment text default null,
  p_promo text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_restaurant public.restaurants;
  v_location public.delivery_locations;
  v_name text := trim(coalesce(p_name, ''));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_promotion uuid;
  v_promo record;
  v_line record;
  v_id uuid;
  v_lines jsonb;
begin
  if p_idempotency_key is null then
    raise exception 'INVALID_INPUT';
  end if;

  -- serialise retries / double clicks carrying the same key
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));
  select * into v_order from public.orders where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('order_id', v_order.id, 'token', v_order.tracking_token, 'created', false);
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'NAME_INVALID';
  end if;
  if v_phone !~ '^0[0-9]{10}$' then
    raise exception 'PHONE_INVALID';
  end if;
  if char_length(coalesce(p_details, '')) > 200 or char_length(coalesce(p_comment, '')) > 500 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_location from public.delivery_locations where id = p_location_id and is_active;
  if not found then
    raise exception 'LOCATION_INVALID';
  end if;

  -- ordering is open to guests: cap how many unconfirmed orders one phone can hold
  if (select count(*) from public.orders where customer_phone = v_phone and status = 'pending') >= 3 then
    raise exception 'TOO_MANY_PENDING';
  end if;

  -- resolve the cart once (validates every line; raises on anything not orderable)
  select jsonb_agg(to_jsonb(l)) into v_lines from public.cart_lines(p_items) l;

  select r.* into v_restaurant from public.restaurants r where r.id = (v_lines -> 0 ->> 'restaurant_id')::uuid;
  if not public.restaurant_is_open(v_restaurant) then
    raise exception 'RESTAURANT_CLOSED';
  end if;

  select sum((l ->> 'unit_price')::integer * (l ->> 'quantity')::integer)::integer into v_subtotal
  from jsonb_array_elements(v_lines) l;
  if v_subtotal < v_restaurant.min_order then
    raise exception 'MIN_ORDER' using detail = v_restaurant.min_order::text;
  end if;

  if nullif(trim(coalesce(p_promo, '')), '') is not null then
    select * into v_promo from public.promo_discount(p_promo, v_restaurant.id, v_subtotal, v_phone, true);
    v_promotion := v_promo.promotion_id;
    v_discount := v_promo.discount;
  end if;

  insert into public.orders (
    restaurant_id, subtotal, delivery_fee, discount, total, promotion_id, promo_code,
    customer_name, customer_phone, location_id, location_label, address_details, comment, idempotency_key
  ) values (
    v_restaurant.id, v_subtotal, v_restaurant.delivery_fee, v_discount,
    v_subtotal + v_restaurant.delivery_fee - v_discount, v_promotion,
    case when v_promotion is not null then upper(trim(p_promo)) end,
    v_name, v_phone, v_location.id,
    coalesce(v_location.name_ku, v_location.name_en),
    nullif(trim(coalesce(p_details, '')), ''), nullif(trim(coalesce(p_comment, '')), ''),
    p_idempotency_key
  )
  returning * into v_order;
  v_id := v_order.id;

  for v_line in
    select l.item_id, l.option_ids, sum(l.quantity)::integer as quantity, l.unit_price,
           m.name_en, m.name_ar, m.name_ku, m.image_url
    from jsonb_to_recordset(v_lines) as l(item_id uuid, option_ids uuid[], quantity integer, unit_price integer)
    join public.menu_items m on m.id = l.item_id
    group by l.item_id, l.option_ids, l.unit_price, m.name_en, m.name_ar, m.name_ku, m.image_url, m.sort_order
    order by m.sort_order
  loop
    insert into public.order_items (
      order_id, item_id, name_en, name_ar, name_ku, image_url, options, unit_price, quantity, line_total
    ) values (
      v_id, v_line.item_id, v_line.name_en, v_line.name_ar, v_line.name_ku, v_line.image_url,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'name_en', o.name_en, 'name_ar', o.name_ar, 'name_ku', o.name_ku, 'price_delta', o.price_delta
        ) order by g.sort_order, o.sort_order)
        from public.options o
        join public.option_groups g on g.id = o.group_id
        where o.id = any (v_line.option_ids)
      ), '[]'::jsonb),
      v_line.unit_price, v_line.quantity, v_line.unit_price * v_line.quantity
    );

    update public.menu_items set order_count = order_count + v_line.quantity where id = v_line.item_id;
  end loop;

  insert into public.order_events (order_id, status) values (v_id, 'pending');

  if v_promotion is not null then
    update public.promotions set used_count = used_count + 1 where id = v_promotion;
  end if;

  return jsonb_build_object('order_id', v_id, 'token', v_order.tracking_token, 'created', true);
end $$;

-- A guest's view of their order. The tracking token is the only credential.
create function public.track_order(p_order uuid, p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', o.id, 'order_number', o.order_number, 'status', o.status,
    'subtotal', o.subtotal, 'delivery_fee', o.delivery_fee, 'discount', o.discount, 'total', o.total,
    'promo_code', o.promo_code, 'customer_name', o.customer_name, 'customer_phone', o.customer_phone,
    'location_label', o.location_label, 'address_details', o.address_details, 'comment', o.comment,
    'rating', o.rating, 'created_at', o.created_at,
    'restaurant', (
      select jsonb_build_object(
        'slug', r.slug, 'name_en', r.name_en, 'name_ar', r.name_ar, 'name_ku', r.name_ku,
        'logo_url', r.logo_url, 'cover_url', r.cover_url, 'phone', r.phone
      ) from public.restaurants r where r.id = o.restaurant_id
    ),
    'order_items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'item_id', i.item_id, 'name_en', i.name_en, 'name_ar', i.name_ar, 'name_ku', i.name_ku,
        'options', i.options, 'unit_price', i.unit_price, 'quantity', i.quantity, 'line_total', i.line_total
      )) from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb),
    'order_events', coalesce((
      select jsonb_agg(jsonb_build_object('status', e.status, 'created_at', e.created_at) order by e.created_at)
      from public.order_events e where e.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order and o.tracking_token = p_token;
$$;

-- Internal: apply a status change and record it.
create function public.apply_order_status(p_order public.orders, p_status public.order_status)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.orders set status = p_status where id = p_order.id;
  insert into public.order_events (order_id, status, actor_id) values (p_order.id, p_status, auth.uid());

  if p_status = 'cancelled' and p_order.promotion_id is not null then
    update public.promotions set used_count = greatest(0, used_count - 1) where id = p_order.promotion_id;
  end if;
end $$;

-- Restaurant / admin: move an order forward (or cancel it).
create function public.set_order_status(p_order uuid, p_status public.order_status) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.orders;
  v_allowed public.order_status[];
begin
  select * into v from public.orders where id = p_order for update;
  if not found or not public.manages_restaurant(v.restaurant_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_allowed := case v.status
    when 'pending' then array['confirmed', 'cancelled']
    when 'confirmed' then array['preparing', 'cancelled']
    when 'preparing' then array['ready', 'cancelled']
    when 'ready' then array['out_for_delivery', 'cancelled']
    when 'out_for_delivery' then array['delivered', 'cancelled']
    else array[]::text[]
  end::public.order_status[];

  if not (p_status = any (v_allowed)) then
    raise exception 'STATUS_TRANSITION_INVALID';
  end if;

  perform public.apply_order_status(v, p_status);
end $$;

-- Customer: cancel their own order while it is still pending.
create function public.cancel_order(p_order uuid, p_token uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.orders;
begin
  select * into v from public.orders where id = p_order and tracking_token = p_token for update;
  if not found then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v.status <> 'pending' then
    raise exception 'ORDER_NOT_CANCELLABLE';
  end if;
  perform public.apply_order_status(v, 'cancelled');
end $$;

-- Customer: rate a delivered order once; keeps the restaurant aggregate in sync.
create function public.rate_order(p_order uuid, p_token uuid, p_rating integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.orders;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'INVALID_INPUT';
  end if;
  select * into v from public.orders where id = p_order and tracking_token = p_token for update;
  if not found then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v.status <> 'delivered' or v.rating is not null then
    raise exception 'ORDER_NOT_RATEABLE';
  end if;

  update public.orders set rating = p_rating, rated_at = now() where id = p_order;

  update public.restaurants r set
    rating_count = s.n,
    rating_avg = s.avg
  from (
    select count(*)::integer as n, round(avg(rating), 1) as avg
    from public.orders where restaurant_id = v.restaurant_id and rating is not null
  ) s
  where r.id = v.restaurant_id;
end $$;

-- Dashboard headline numbers for one restaurant.
create function public.restaurant_stats(p_restaurant uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.manages_restaurant(p_restaurant) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'active', count(*) filter (where status not in ('delivered', 'cancelled')),
      'today_orders', count(*) filter (
        where status <> 'cancelled'
          and (created_at at time zone 'Asia/Baghdad')::date = (now() at time zone 'Asia/Baghdad')::date
      ),
      'today_revenue', coalesce(sum(total) filter (
        where status <> 'cancelled'
          and (created_at at time zone 'Asia/Baghdad')::date = (now() at time zone 'Asia/Baghdad')::date
      ), 0),
      'total_orders', count(*) filter (where status <> 'cancelled')
    )
    from public.orders where restaurant_id = p_restaurant
  );
end $$;
