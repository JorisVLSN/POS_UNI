# Mews POS Academy

A gated learning platform for hotel staff onboarding to Mews POS.
Email-verified access, sequential video lessons with anti-skip, admin CMS, and Salesforce-linked progress reporting.

---

## Stack

- **Frontend**: React (Create React App)
- **Auth + Database**: Supabase
- **Video**: YouTube (unlisted)
- **Hosting**: Vercel

---

## Setup in 5 steps

### 1. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Open the SQL Editor
3. Paste and run the full contents of `supabase-schema.sql`
4. Copy your **Project URL** and **anon public key** from Settings → API

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in:
# REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
# REACT_APP_SUPABASE_ANON_KEY=eyJ...
```

### 3. Configure Supabase Auth

In Supabase dashboard → Authentication → Settings:
- **Site URL**: your Vercel URL (e.g. `https://mews-pos-academy.vercel.app`)
- **Redirect URLs**: add `https://mews-pos-academy.vercel.app/auth/callback`
- Email magic links are enabled by default — no extra config needed

### 4. Make yourself admin

After deploying and signing in for the first time, run this in the Supabase SQL editor:

```sql
UPDATE user_profiles SET is_admin = true WHERE email = 'your@email.com';
```

Then sign out and back in. You'll be routed to `/admin`.

### 5. Deploy to Vercel

```bash
# Push to GitHub first, then:
# 1. Import repo in Vercel
# 2. Set environment variables (same as .env):
#    REACT_APP_SUPABASE_URL
#    REACT_APP_SUPABASE_ANON_KEY
# 3. Deploy
```

Or via CLI:
```bash
npm install -g vercel
vercel --prod
```

---

## Salesforce sync (daily)

Schedule a Claude task (daily, e.g. 06:00) with this prompt:

```
Use the Salesforce MCP connector to query all active POS onboarding opportunities.
For each, extract: Account Name, Opportunity ID (as salesforce_id), and Owner email (as onboarding_manager_email).
Then use the Supabase MCP to upsert these into the `properties` table.
Upsert key: salesforce_id. Also write synced_at = now().
Log how many records were processed.
```

See `salesforce-sync.js` for the SOQL query and full notes.

After sync, go to **Admin → Users** to assign each learner to their property.

---

## Admin workflow

1. **Chapters** (`/admin/chapters`): Create chapters, set order, publish when ready
2. **Lessons** (`/admin/chapters/:id/lessons`): Add lessons with YouTube URLs, set order
3. **Users** (`/admin/users`): Assign learners to their Salesforce property
4. **Progress** (`/admin/progress`): Filter by OM or property, export CSV

---

## Learner flow

1. Enter email → receive magic link
2. Click link → land on `/track`
3. Complete lessons in sequence (can't skip forward in video)
4. Completion unlocks next lesson

---

## YouTube video setup

For each lesson video:
1. Upload to YouTube
2. Set visibility to **Unlisted**
3. Copy the full URL (e.g. `https://www.youtube.com/watch?v=VIDEO_ID`)
4. Paste into the lesson form in the admin panel

---

## Local development

```bash
npm install
npm start
# Opens at http://localhost:3000
```

Update Supabase Auth → Site URL to `http://localhost:3000` while developing locally.
Add `http://localhost:3000/auth/callback` to redirect URLs.
