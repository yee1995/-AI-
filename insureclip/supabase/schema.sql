-- InsureClip Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text not null,
  license_no text,
  company text,
  language_pref text not null default 'cantonese' check (language_pref in ('cantonese', 'mandarin', 'english')),
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro', 'team')),
  avatar_count integer not null default 0,
  videos_used_this_month integer not null default 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Avatars table
create table public.avatars (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  heygen_avatar_id text not null,
  voice_id text,
  status text not null default 'processing' check (status in ('processing', 'active', 'failed')),
  name text not null default 'My Avatar',
  preview_url text,
  quality_score numeric,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Topics table (curated library)
create table public.topics (
  id uuid default uuid_generate_v4() primary key,
  category text not null check (category in ('product_education', 'life_events', 'market_commentary', 'seasonal', 'client_engagement')),
  title_en text not null,
  title_zh text not null,
  description_en text,
  description_zh text,
  season text,
  tags text[] default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Scripts table
create table public.scripts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  topic_id uuid references public.topics(id) on delete set null,
  topic_title text not null,
  language text not null check (language in ('cantonese', 'mandarin', 'english')),
  tone text not null check (tone in ('professional', 'warm_casual', 'educational')),
  length integer not null check (length in (15, 30, 45, 60)),
  structure text not null check (structure in ('problem_solution', 'story', 'list', 'qa')),
  cta text not null check (cta in ('contact_me', 'book_review', 'learn_more', 'none')),
  content text not null,
  compliance_status text not null default 'pass' check (compliance_status in ('pass', 'warning', 'fail')),
  compliance_notes jsonb default '[]',
  word_count integer,
  estimated_duration integer,
  created_at timestamptz not null default now()
);

-- Videos table
create table public.videos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  avatar_id uuid references public.avatars(id) on delete set null,
  script_id uuid references public.scripts(id) on delete set null not null,
  heygen_video_id text,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  output_url text,
  watermarked_url text,
  thumbnail_url text,
  duration integer,
  format text not null default 'general' check (format in ('instagram_reels', 'youtube_shorts', 'tiktok', 'linkedin', 'whatsapp', 'general')),
  aspect_ratio text,
  file_size_bytes integer,
  error_message text,
  include_intro_outro boolean default true,
  include_subtitles boolean default true,
  background_music boolean default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Calendar suggestions table
create table public.calendar_suggestions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  topic_id uuid references public.topics(id) on delete cascade not null,
  suggested_date date not null,
  status text not null default 'pending' check (status in ('pending', 'used', 'dismissed')),
  created_at timestamptz not null default now()
);

-- Analytics events table
create table public.analytics_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  video_id uuid references public.videos(id) on delete set null,
  event_type text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index idx_avatars_user_id on public.avatars(user_id);
create index idx_scripts_user_id on public.scripts(user_id);
create index idx_videos_user_id on public.videos(user_id);
create index idx_videos_status on public.videos(status);
create index idx_calendar_suggestions_user_id on public.calendar_suggestions(user_id);
create index idx_calendar_suggestions_status on public.calendar_suggestions(status);
create index idx_analytics_events_user_id on public.analytics_events(user_id);
create index idx_topics_category on public.topics(category);
create index idx_topics_active on public.topics(active);

-- Row Level Security
alter table public.users enable row level security;
alter table public.avatars enable row level security;
alter table public.scripts enable row level security;
alter table public.videos enable row level security;
alter table public.calendar_suggestions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.topics enable row level security;

-- RLS Policies: users can only see their own data
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

create policy "Users can view own avatars" on public.avatars for select using (auth.uid() = user_id);
create policy "Users can insert own avatars" on public.avatars for insert with check (auth.uid() = user_id);
create policy "Users can update own avatars" on public.avatars for update using (auth.uid() = user_id);

create policy "Users can view own scripts" on public.scripts for select using (auth.uid() = user_id);
create policy "Users can insert own scripts" on public.scripts for insert with check (auth.uid() = user_id);
create policy "Users can update own scripts" on public.scripts for update using (auth.uid() = user_id);

create policy "Users can view own videos" on public.videos for select using (auth.uid() = user_id);
create policy "Users can insert own videos" on public.videos for insert with check (auth.uid() = user_id);
create policy "Users can update own videos" on public.videos for update using (auth.uid() = user_id);

create policy "Users can view own calendar suggestions" on public.calendar_suggestions for select using (auth.uid() = user_id);
create policy "Users can update own calendar suggestions" on public.calendar_suggestions for update using (auth.uid() = user_id);

create policy "Topics are viewable by all authenticated users" on public.topics for select using (auth.role() = 'authenticated');

-- Function to handle new user registration
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to reset monthly video counts (run via cron)
create or replace function public.reset_monthly_video_counts()
returns void as $$
begin
  update public.users set videos_used_this_month = 0;
end;
$$ language plpgsql security definer;
