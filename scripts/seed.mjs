// Seeds a Supabase project with the original Pasha Restaurant menu
// (public/en.js, ar.js, ku-sor.js) and, optionally, an admin account.
//
//   npm run seed
//
// Needs NEXT_PUBLIC_SUPABASE_URL in .env.local, plus either SUPABASE_SERVICE_ROLE_KEY
// or the publishable key with the login of an existing admin (SEED_ADMIN_EMAIL / _PASSWORD).
// Safe to re-run: existing rows are left untouched.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const file of ['.env.local', '.env']) {
  if (existsSync(path.join(root, file))) process.loadEnvFile(path.join(root, file));
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const { SEED_ADMIN_EMAIL: adminEmail, SEED_ADMIN_PASSWORD: adminPassword } = process.env;
if (!url || !(serviceKey || (anonKey && adminEmail && adminPassword))) {
  console.error(
    'Need NEXT_PUBLIC_SUPABASE_URL plus either SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY with the\n' +
      'SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD of an existing admin account (see .env.example).'
  );
  process.exit(1);
}
const supabase = createClient(url, serviceKey || anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

const [en, ar, ku] = await Promise.all(
  ['en.js', 'ar.js', 'ku-sor.js'].map(async (f) => (await import(path.join(root, 'public', f))).default)
);

const SECTIONS = {
  grills: { en: 'Grills', ku: 'برژاو', ar: 'مشويات' },
  'chicken-wings': { en: 'Chicken Wings', ku: 'باڵی مریشک', ar: 'اجنحة دجاج' },
  shawarma: { en: 'Shawarma', ku: 'شاورمە', ar: 'شاورما' },
  'chicken-burger': { en: 'Chicken Burger', ku: 'بەرگری مریشک', ar: 'بركر دجاج' },
  rizo: {
    en: 'Rizo', ku: 'ڕیزۆ', ar: 'ريزو',
    note: { en: 'Sauce: Honey Mustard + Classic BBQ', ku: 'سۆس (هانی ماستەرد + باربیکیۆ کلاسیک)', ar: 'صوص (هاني ماستر + باربيكيو كلاسيك)' },
  },
  finger: { en: 'Finger', ku: 'فینگەر', ar: 'فينكر' },
  'beef-burger': { en: 'Beef Burger', ku: 'بەرگری گۆشت', ar: 'بركر لحم' },
};
const titleCase = (key) => key.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

// ---- admin account
// With the service-role key the admin account is created here. Without it we
// sign in as an existing admin and seed through the normal API (RLS applies).
let adminId = null;
if (!serviceKey) {
  const signedIn = must(await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword }), 'sign in as admin');
  adminId = signedIn.user.id;
  const profile = must(await supabase.from('profiles').select('role').eq('id', adminId).single(), 'read admin profile');
  if (profile.role !== 'admin') throw new Error(`${adminEmail} is not an admin: set role = 'admin' on its row in public.profiles first`);
  console.log(`✓ signed in as admin: ${adminEmail}`);
} else if (adminEmail && adminPassword) {
  const existing = must(await supabase.from('profiles').select('id').ilike('email', adminEmail).maybeSingle(), 'find admin');
  if (existing) {
    adminId = existing.id;
  } else {
    const created = must(
      await supabase.auth.admin.createUser({ email: adminEmail, password: adminPassword, email_confirm: true, user_metadata: { full_name: 'Admin' } }),
      'create admin'
    );
    adminId = created.user.id;
  }
  must(await supabase.from('profiles').update({ role: 'admin' }).eq('id', adminId).select('id'), 'promote admin');
  console.log(`✓ admin account ready: ${adminEmail}`);
} else {
  console.log('• SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set: skipping admin account');
}

// ---- restaurant
let restaurant = must(await supabase.from('restaurants').select('id, cover_url').eq('slug', 'pasha').maybeSingle(), 'find restaurant');
if (!restaurant) {
  restaurant = must(
    await supabase
      .from('restaurants')
      .insert({
        slug: 'pasha',
        owner_id: adminId,
        name_en: 'Kebab Pasha', name_ar: 'کباب باشا', name_ku: 'کەباب پاشا',
        description_en: 'Charcoal grills, shawarma, burgers and crispy wings.',
        description_ar: 'مشويات على الفحم، شاورما، بركر وأجنحة مقرمشة.',
        description_ku: 'برژاوی سەر خەڵووز، شاورمە، بەرگر و باڵی برژاو.',
        phone: '0750 448 98 92 - 0771 101 05 00',
        logo_url: '/brand/logo.webp', // shipped in /public/brand
        cover_url: '/brand/cover.webp',
        prep_minutes: 20,
        is_active: true,
        is_featured: true,
      })
      .select('id, cover_url')
      .single(),
    'create restaurant'
  );
  console.log('✓ restaurant created: Kebab Pasha');
} else {
  console.log('• restaurant "pasha" already exists');
}

const existingItems = must(await supabase.from('menu_items').select('id', { count: 'exact', head: false }).eq('restaurant_id', restaurant.id).limit(1), 'count items');
if (existingItems.length > 0) {
  console.log('• menu already seeded: nothing to do');
  process.exit(0);
}

// ---- images -> Supabase Storage (resized when sharp is available)
let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.log('• sharp not installed: uploading original images');
}
const uploaded = new Map();
let storageWorks = true;
async function imageUrl(file) {
  if (!file) return null;
  const name = file.replace(/^\/?(images\/)?/, '');
  if (uploaded.has(name)) return uploaded.get(name);
  const fallback = `/images/${name}`; // served by Next.js from /public
  let result = fallback;
  const source = path.join(root, 'public', 'images', name);
  if (storageWorks && existsSync(source)) {
    try {
      let body = await readFile(source);
      let ext = path.extname(name).slice(1).toLowerCase().replace('jpeg', 'jpg');
      let contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
      if (sharp) {
        body = await sharp(body).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        ext = 'webp';
        contentType = 'image/webp';
      }
      const key = `${restaurant.id}/items/${path.parse(name).name.toLowerCase()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(key, body, { contentType, cacheControl: '31536000', upsert: true });
      if (error) throw error;
      result = supabase.storage.from('media').getPublicUrl(key).data.publicUrl;
    } catch (e) {
      storageWorks = false;
      console.warn(`! storage upload failed (${e.message}); using /public/images paths instead`);
    }
  }
  uploaded.set(name, result);
  return result;
}

// ---- categories + items
let itemCount = 0;
let sort = 0;
for (const [index, key] of Object.keys(en).entries()) {
  const names = SECTIONS[key] || { en: titleCase(key) };
  const category = must(
    await supabase
      .from('categories')
      .insert({
        restaurant_id: restaurant.id,
        name_en: names.en, name_ar: names.ar || null, name_ku: names.ku || null,
        note_en: names.note?.en || null, note_ar: names.note?.ar || null, note_ku: names.note?.ku || null,
        sort_order: index,
      })
      .select('id')
      .single(),
    `create category ${key}`
  );

  const rows = [];
  for (const item of en[key]) {
    const inAr = (ar[key] || []).find((i) => i.id === item.id);
    const inKu = (ku[key] || []).find((i) => i.id === item.id);
    rows.push({
      restaurant_id: restaurant.id,
      category_id: category.id,
      name_en: item.name, name_ar: inAr?.name || null, name_ku: inKu?.name || null,
      description_en: item.description || null, description_ar: inAr?.description || null, description_ku: inKu?.description || null,
      price: Math.round(Number(item.price) || 0),
      image_url: await imageUrl(item.image),
      sort_order: sort++,
    });
  }
  must(await supabase.from('menu_items').insert(rows).select('id'), `create items for ${key}`);
  itemCount += rows.length;
}

if (!restaurant.cover_url) {
  const cover = await imageUrl(en.grills?.[0]?.image);
  must(await supabase.from('restaurants').update({ cover_url: cover, logo_url: cover }).eq('id', restaurant.id).select('id'), 'set cover');
}

console.log(`✓ seeded ${Object.keys(en).length} categories and ${itemCount} items${storageWorks ? ' (images in Supabase Storage)' : ''}`);
