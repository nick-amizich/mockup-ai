-- Messages table (conversation log)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  screenshot_url text,
  tool_name text,
  tool_input jsonb,
  tool_output text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.messages enable row level security;

-- Users can access messages for their sessions
create policy "Users can view messages for own sessions"
  on public.messages for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id
      and s.user_id = (select auth.uid())
    )
  );

create policy "Users can create messages for own sessions"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_id
      and s.user_id = (select auth.uid())
    )
  );

-- Indexes
create index idx_messages_session_id on public.messages(session_id);
create index idx_messages_created_at on public.messages(created_at);
