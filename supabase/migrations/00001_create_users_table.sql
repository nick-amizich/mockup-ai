-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  avatar_url text,
  plan text default 'free' check (plan in ('free', 'pro', 'team')),
  sessions_used_this_month int default 0,
  billing_cycle_start timestamptz default now(),
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Users can read their own data
create policy "Users can view own profile"
  on public.users for select
  using ((select auth.uid()) = id);

-- Users can update their own data
create policy "Users can update own profile"
  on public.users for update
  using ((select auth.uid()) = id);

-- Create index for performance
create index idx_users_email on public.users(email);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- Trigger to create user profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger function
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_users_updated_at
  before update on public.users
  for each row execute procedure public.update_updated_at_column();
