-- Staff accounts are managed from the dashboard (Users tab) by a signed-in
-- manager. Customers never have accounts. These functions write to Supabase
-- Auth's tables directly so that no service-role key is needed in the app;
-- every one of them first checks that the caller is a manager (role = admin).

create function public.admin_create_user(
  p_email text, p_password text, p_full_name text, p_phone text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := trim(coalesce(p_full_name, ''));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or char_length(v_email) > 254 then
    raise exception 'EMAIL_INVALID';
  end if;
  if char_length(coalesce(p_password, '')) < 8 or char_length(p_password) > 72 then
    raise exception 'PASSWORD_INVALID';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'NAME_INVALID';
  end if;
  if v_phone <> '' and v_phone !~ '^0[0-9]{10}$' then
    raise exception 'PHONE_INVALID';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'EMAIL_TAKEN';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v_name, 'phone', v_phone), now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_id, v_id::text, 'email',
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
    now(), now(), now()
  );

  -- the signup trigger has created the profile; everyone added here is a manager
  update public.profiles set role = 'admin', full_name = v_name, phone = nullif(v_phone, '') where id = v_id;
  return v_id;
end $$;

create function public.admin_update_user(
  p_user uuid, p_full_name text, p_phone text default null, p_email text default null, p_password text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := trim(coalesce(p_full_name, ''));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'USER_NOT_FOUND';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'NAME_INVALID';
  end if;
  if v_phone <> '' and v_phone !~ '^0[0-9]{10}$' then
    raise exception 'PHONE_INVALID';
  end if;

  update public.profiles set full_name = v_name, phone = nullif(v_phone, '') where id = p_user;

  if v_email <> '' and v_email <> (select lower(email) from auth.users where id = p_user) then
    if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or char_length(v_email) > 254 then
      raise exception 'EMAIL_INVALID';
    end if;
    if exists (select 1 from auth.users where lower(email) = v_email and id <> p_user) then
      raise exception 'EMAIL_TAKEN';
    end if;
    update auth.users set email = v_email, updated_at = now() where id = p_user;
    update auth.identities
      set identity_data = identity_data || jsonb_build_object('email', v_email), updated_at = now()
      where user_id = p_user and provider = 'email';
  end if;

  if coalesce(p_password, '') <> '' then
    if char_length(p_password) < 8 or char_length(p_password) > 72 then
      raise exception 'PASSWORD_INVALID';
    end if;
    update auth.users
      set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
      where id = p_user;
  end if;
end $$;

create function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'CANNOT_REMOVE_SELF';
  end if;
  -- removes the login, its sessions and (by cascade) the profile
  delete from auth.users where id = p_user;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;
end $$;

revoke all on function public.admin_create_user(text, text, text, text) from public, anon;
revoke all on function public.admin_update_user(uuid, text, text, text, text) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_create_user(text, text, text, text) to authenticated, service_role;
grant execute on function public.admin_update_user(uuid, text, text, text, text) to authenticated, service_role;
grant execute on function public.admin_delete_user(uuid) to authenticated, service_role;
