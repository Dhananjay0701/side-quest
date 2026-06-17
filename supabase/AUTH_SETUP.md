# Supabase Auth Setup

## 1. Run migrations (in order)

In Supabase SQL Editor, run all files in `supabase/migrations/`:

| Migration | Purpose |
|-----------|---------|
| `001_initial_schema.sql` | Core tables |
| `002_search_vector.sql` | Full-text search |
| `003_collection_is_deleted.sql` | Soft delete |
| `004_place_interesting_facts.sql` | AI interesting facts |
| **`005_auth_profiles_rls.sql`** | **Auth profiles + RLS** |

Migration `005` will:
- Rename `users` → `profiles`
- Link `profiles.auth_user_id` → `auth.users(id)`
- Add `username` with auto-generated fallback
- Create profile on signup trigger
- Enable RLS for private/public collection access

## 2. Enable auth providers

Supabase Dashboard → **Authentication** → **Providers**:

### Email
- Enable Email provider
- (Optional) Disable "Confirm email" for faster local dev

### Google OAuth
1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
2. Add authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Paste Client ID + Secret into Supabase Google provider settings

## 3. Configure redirect URLs

Supabase Dashboard → **Authentication** → **URL Configuration**:

| Setting | Value |
|---------|-------|
| Site URL | `http://localhost:3000` (or your production URL) |
| Redirect URLs | `http://localhost:3000/auth/callback` |

## 4. Collection visibility model

| `is_public` | Who can see |
|-------------|-------------|
| `false` (default) | **Private** — only the owner |
| `true` | **Public** — everyone (Explore page) |

- New imports default to **private**
- Owners toggle Public/Private on the collection detail hero
- RLS enforces access at the database level

## 5. How auth works in the app

- **Sign up / Sign in**: `/signup`, `/login` (email+password or Google OAuth)
- **Sessions**: Supabase Auth cookies, refreshed via `middleware.ts`
- **Profiles**: Auto-created on signup via DB trigger; `username` auto-generated from email
- **Protected actions**: CSV upload, cover upload, delete collection, visibility toggle
- **No passwords in app tables** — Supabase Auth handles all credential storage

## 6. Legacy data note

Pre-auth anonymous sessions (`session_token` on old `users` rows) are not migrated automatically. After enabling auth, users sign up fresh and re-import collections.
