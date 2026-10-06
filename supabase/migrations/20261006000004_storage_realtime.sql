-- Storage buckets + policies, and realtime for order tracking.

-- Public-read buckets with server-enforced size and type limits.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 3145728, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- media/<restaurant_id>/...  : only whoever manages that restaurant may write.
-- Public buckets are served by URL without a select policy, so none is added
-- for anonymous users (this also prevents listing bucket contents).
create policy media_manager_select on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.manages_restaurant(public.try_uuid((storage.foldername(name))[1])));
create policy media_manager_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.manages_restaurant(public.try_uuid((storage.foldername(name))[1])));
create policy media_manager_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.manages_restaurant(public.try_uuid((storage.foldername(name))[1])))
  with check (bucket_id = 'media' and public.manages_restaurant(public.try_uuid((storage.foldername(name))[1])));
create policy media_manager_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.manages_restaurant(public.try_uuid((storage.foldername(name))[1])));

-- avatars/<user_id>/... : only that user may write.
create policy avatars_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Realtime: order status changes (RLS still applies to what each client receives).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- Campus delivery points (from the original checkout form).
insert into public.delivery_locations (name_en, name_ar, name_ku, sort_order) values
  ('Law + Engineering Building', 'بناية القانون + الهندسة', 'باڵەخانەی یاسا + ئەندازیاری', 1),
  ('Dentistry Building', 'بناية طب الأسنان', 'باڵەخانەی ددانسازی', 2),
  ('Pharmacy Building', 'بناية الصيدلة', 'باڵەخانەی دەرمانسازی', 3),
  ('Technical Building', 'البناية التقنية', 'باڵەخانەی تەکنیکی', 4),
  ('Accounting + Registration + Media Building', 'بناية الحسابات + التسجيل + الإعلام', 'باڵەخانەی ژمێریاری + تۆمار + ڕاگەیاندن', 5),
  ('University Presidency Building', 'بناية رئاسة الجامعة', 'باڵەخانەی سەرۆکایەتی زانکۆ', 6),
  ('Dormitory', 'القسم الداخلي', 'بەشی ناوخۆیی', 7),
  ('Dormitory (inside the garage)', 'القسم الداخلي داخل الكراج', 'بەشی ناوخۆیی ناو گەراج', 8);
