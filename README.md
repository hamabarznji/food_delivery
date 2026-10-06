# Kebab Pasha

Online menu and ordering for Kebab Pasha. Customers browse the menu, fill a cart and enter
their name, phone and building to order; the order is saved to the database and sent to the
restaurant's Telegram chat. Managers log in to edit the menu and manage staff logins.
Kurdish (default), Arabic and English, with full RTL support.

Built with Next.js 15 (App Router), React 19, Tailwind CSS 4 and Supabase
(PostgreSQL, Auth, Row Level Security, Storage).

## Setup

1. **Create a Supabase project** at <https://supabase.com/dashboard>.

2. **Configure the environment**

   ```bash
   cp .env.example .env.local
   ```

   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Project Settings → API; the `sb_publishable_…` key works as the anon key).
   `SUPABASE_SERVICE_ROLE_KEY` is optional and only used by the seed script; the web app
   never reads it and it must never get a `NEXT_PUBLIC_` prefix.

3. **Create the database** – either with the CLI:

   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

   or by running the files in `supabase/migrations/` in order in the SQL editor.

4. **Auth settings** (Authentication → URL Configuration): set the Site URL to your
   domain and add `<site>/auth/callback` to the redirect URLs
   (`http://localhost:3000/auth/callback` for development).

5. **Seed** the original Pasha Restaurant menu (categories, items, images):

   ```bash
   npm run seed
   ```

   With `SUPABASE_SERVICE_ROLE_KEY` set, the script also creates the first manager from
   `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. Without it, create that user in the Supabase
   dashboard (Authentication → Users), set `role = 'admin'` on its row in `public.profiles`,
   and put the same login in `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

6. **Run**

   ```bash
   npm install
   npm run dev
   ```

## Who logs in

**Customers never log in.** The cart, their past orders and their last-used details are kept
in the browser.

**Managers log in** at `/login` (linked in the footer as "Restaurant dashboard") and get two tabs:

- **Menu** – add, edit, hide and remove items and categories, with images and options.
- **Users** – add, edit and remove manager logins. Every user created there can manage the
  menu and the users.

There is no public sign-up. Disable "Allow new users to sign up" in Supabase
(Authentication → Sign In / Providers) so accounts can only be created from the Users tab.

## How it fits together

- `supabase/migrations/` – schema, functions, RLS policies, storage buckets, realtime.
  Authorisation lives here: the UI only hides what the database would refuse anyway.
- Orders are created by the `place_order()` database function. The browser sends only
  item ids and quantities; every amount (prices, options, delivery, promo) is computed
  in the database. It is idempotent, so a double click or retry cannot create two orders,
  and one phone number can hold at most three unconfirmed orders at a time.
- A guest re-opens their order confirmation with its private token (`track_order()`); the
  `orders` tables themselves are only readable by staff. The database also supports order
  statuses, promo codes and several restaurants, but the app does not expose them for now.
- Staff logins are created by the `admin_create_user()` family of database functions, which
  only a signed-in manager can call, so the app needs no service-role key.
- Removing a menu item archives it. Order lines keep a snapshot of names and prices, so
  history is never affected by menu edits.
- Images are resized in the browser and stored in Supabase Storage
  (`media/<restaurant_id>/…`, staff avatars in `avatars/<user_id>/…`).
- Each new order is sent to Telegram from the server after it is saved
  (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_IDS`). Without those two settings orders are only
  stored in the database and nobody is notified.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint |
| `npm test` | unit tests (pricing, opening hours, input sanitising, translations) |
| `npm run test:db` | integration tests for RLS, auth and the order functions against a disposable Postgres + Supabase Auth + PostgREST stack (needs Docker and `psql`) |
| `npm run seed` | import the Pasha menu and create the admin account |
