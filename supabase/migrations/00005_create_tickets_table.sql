-- Tickets table (approved mockups with Claude Code prompt)
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  prompt text not null,
  status text default 'open' check (status in ('open', 'in_progress', 'done')),
  before_screenshot text,
  after_screenshot text,
  page_url text,
  changes_summary jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.tickets enable row level security;

-- Users can CRUD their own tickets
create policy "Users can view own tickets"
  on public.tickets for select
  using ((select auth.uid()) = user_id);

create policy "Users can create own tickets"
  on public.tickets for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own tickets"
  on public.tickets for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete own tickets"
  on public.tickets for delete
  using ((select auth.uid()) = user_id);

-- Indexes
create index idx_tickets_user_id on public.tickets(user_id);
create index idx_tickets_project_id on public.tickets(project_id);
create index idx_tickets_session_id on public.tickets(session_id);
create index idx_tickets_status on public.tickets(status);

-- Updated_at trigger
create trigger update_tickets_updated_at
  before update on public.tickets
  for each row execute procedure public.update_updated_at_column();
