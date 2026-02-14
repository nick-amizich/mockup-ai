-- Mockup Sessions table
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade not null,
  page_url text not null,
  page_title text,
  status text default 'active' check (status in ('active', 'completed', 'discarded')),
  before_html text,
  after_html text,
  before_css text,
  after_css text,
  before_screenshot text,
  after_screenshot text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.sessions enable row level security;

-- Users can CRUD their own sessions
create policy "Users can view own sessions"
  on public.sessions for select
  using ((select auth.uid()) = user_id);

create policy "Users can create own sessions"
  on public.sessions for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own sessions"
  on public.sessions for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete own sessions"
  on public.sessions for delete
  using ((select auth.uid()) = user_id);

-- Indexes
create index idx_sessions_user_id on public.sessions(user_id);
create index idx_sessions_project_id on public.sessions(project_id);
create index idx_sessions_status on public.sessions(status);

-- Updated_at trigger
create trigger update_sessions_updated_at
  before update on public.sessions
  for each row execute procedure public.update_updated_at_column();
