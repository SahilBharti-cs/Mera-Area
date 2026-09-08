create extension if not exists "uuid-ossp";

create type public.problem_category as enum (
  'Jobs', 'Education', 'Lost & Found', 'Local Services', 'Health',
  'Government Schemes', 'Buy / Sell', 'Emergency', 'Other'
);

create type public.moderation_status as enum ('Open', 'Reviewing', 'Resolved');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  avatar_url text,
  language text not null default 'en' check (language in ('en', 'hi')),
  city text not null,
  locality text not null,
  points integer not null default 0,
  streak integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.problems (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 8 and 140),
  body text not null check (char_length(body) between 12 and 5000),
  category public.problem_category not null,
  city text not null,
  locality text not null,
  image_path text,
  voice_path text,
  solved boolean not null default false,
  reported boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.answers (
  id uuid primary key default uuid_generate_v4(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 2 and 5000),
  helpful_count integer not null default 0,
  reported boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.answer_helpful_votes (
  answer_id uuid not null references public.answers(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, voter_id)
);

create table public.badges (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  unique (profile_id, badge_key)
);

create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  problem_id uuid references public.problems(id) on delete cascade,
  answer_id uuid references public.answers(id) on delete cascade,
  reason text not null,
  status public.moderation_status not null default 'Open',
  created_at timestamptz not null default now(),
  check ((problem_id is not null) or (answer_id is not null))
);

alter table public.profiles enable row level security;
alter table public.problems enable row level security;
alter table public.answers enable row level security;
alter table public.answer_helpful_votes enable row level security;
alter table public.badges enable row level security;
alter table public.reports enable row level security;

create policy "profiles are visible in the same locality"
  on public.profiles for select to authenticated
  using (locality = (select locality from public.profiles where id = auth.uid()));

create policy "users update their own profile"
  on public.profiles for update to authenticated using (id = auth.uid());

create policy "locality problems are readable"
  on public.problems for select to authenticated
  using (locality = (select locality from public.profiles where id = auth.uid()));

create policy "users create their own problems"
  on public.problems for insert to authenticated with check (author_id = auth.uid());

create policy "authors update their own problems"
  on public.problems for update to authenticated using (author_id = auth.uid());

create policy "locality answers are readable"
  on public.answers for select to authenticated
  using (exists (select 1 from public.problems p where p.id = problem_id and p.locality = (select locality from public.profiles where id = auth.uid())));

create policy "users create their own answers"
  on public.answers for insert to authenticated with check (author_id = auth.uid());

create policy "users manage their own votes"
  on public.answer_helpful_votes for all to authenticated using (voter_id = auth.uid()) with check (voter_id = auth.uid());

create policy "users see their own badges"
  on public.badges for select to authenticated using (profile_id = auth.uid());

create policy "users create reports"
  on public.reports for insert to authenticated with check (reporter_id = auth.uid());

create policy "users see their own reports"
  on public.reports for select to authenticated using (reporter_id = auth.uid());
