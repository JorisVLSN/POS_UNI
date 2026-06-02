-- ============================================
-- MEWS POS ACADEMY — Supabase Schema
-- Run this in your Supabase SQL editor once
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- CHAPTERS
-- ============================================
create table chapters (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  order_index integer not null default 0,
  published boolean not null default false,
  created_at timestamptz default now()
);

-- ============================================
-- LESSONS
-- ============================================
create table lessons (
  id uuid primary key default uuid_generate_v4(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  title text not null,
  description text,
  youtube_url text not null,
  order_index integer not null default 0,
  published boolean not null default false,
  created_at timestamptz default now()
);

-- ============================================
-- PROPERTIES (synced from Salesforce nightly)
-- ============================================
create table properties (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  salesforce_id text unique not null,
  onboarding_manager_email text,
  synced_at timestamptz default now()
);

-- ============================================
-- USER PROFILES (extends Supabase auth.users)
-- ============================================
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  is_admin boolean not null default false,
  property_id uuid references properties(id),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into user_profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================
-- PROGRESS
-- ============================================
create table progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed_at timestamptz default now(),
  watch_seconds integer default 0,
  unique(user_id, lesson_id)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Chapters: public read if published, admin full access
alter table chapters enable row level security;
create policy "Published chapters visible to all authenticated" on chapters
  for select using (auth.role() = 'authenticated' and published = true);
create policy "Admins can manage chapters" on chapters
  for all using (
    exists (select 1 from user_profiles where id = auth.uid() and is_admin = true)
  );

-- Lessons: public read if published
alter table lessons enable row level security;
create policy "Published lessons visible to all authenticated" on lessons
  for select using (auth.role() = 'authenticated' and published = true);
create policy "Admins can manage lessons" on lessons
  for all using (
    exists (select 1 from user_profiles where id = auth.uid() and is_admin = true)
  );

-- Properties: authenticated read, admin write
alter table properties enable row level security;
create policy "Authenticated users can read properties" on properties
  for select using (auth.role() = 'authenticated');
create policy "Admins can manage properties" on properties
  for all using (
    exists (select 1 from user_profiles where id = auth.uid() and is_admin = true)
  );

-- User profiles: own profile + admin all
alter table user_profiles enable row level security;
create policy "Users can read own profile" on user_profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on user_profiles
  for update using (auth.uid() = id);
create policy "Admins can read all profiles" on user_profiles
  for select using (
    exists (select 1 from user_profiles where id = auth.uid() and is_admin = true)
  );

-- Progress: own progress + admin all
alter table progress enable row level security;
create policy "Users can manage own progress" on progress
  for all using (auth.uid() = user_id);
create policy "Admins can read all progress" on progress
  for select using (
    exists (select 1 from user_profiles where id = auth.uid() and is_admin = true)
  );

-- ============================================
-- ADMIN PROGRESS VIEW (for report)
-- ============================================
create or replace view admin_progress_report as
select
  p.id as property_id,
  p.name as property_name,
  p.onboarding_manager_email,
  p.salesforce_id,
  up.id as user_id,
  up.email as user_email,
  l.id as lesson_id,
  l.title as lesson_title,
  c.id as chapter_id,
  c.title as chapter_title,
  c.order_index as chapter_order,
  l.order_index as lesson_order,
  pr.completed_at,
  pr.watch_seconds,
  case when pr.id is not null then true else false end as completed
from properties p
join user_profiles up on up.property_id = p.id
cross join lessons l
join chapters c on c.id = l.chapter_id
left join progress pr on pr.user_id = up.id and pr.lesson_id = l.id
where l.published = true and c.published = true
order by p.name, up.email, c.order_index, l.order_index;

-- Grant view access to authenticated users with admin check handled in app
grant select on admin_progress_report to authenticated;

-- ============================================
-- MAKE YOURSELF ADMIN
-- After first login, run this with your user ID:
-- update user_profiles set is_admin = true where email = 'your@email.com';
-- ============================================
