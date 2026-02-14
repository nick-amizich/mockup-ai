-- Projects table (group mockups by site)
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  url text,
  description text,
  favicon_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.projects enable row level security;

-- Users can CRUD their own projects
create policy "Users can view own projects"
  on public.projects for select
  using ((select auth.uid()) = user_id);

create policy "Users can create own projects"
  on public.projects for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using ((select auth.uid()) = user_id);

-- Indexes
create index idx_projects_user_id on public.projects(user_id);

-- Updated_at trigger
create trigger update_projects_updated_at
  before update on public.projects
  for each row execute procedure public.update_updated_at_column();
