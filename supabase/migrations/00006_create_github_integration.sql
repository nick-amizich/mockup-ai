-- Migration: Create GitHub Integration Tables
-- Description: Tables for storing GitHub OAuth tokens and linking repos to projects

-- ============================================
-- GitHub Connections Table
-- ============================================
-- Stores encrypted GitHub OAuth tokens for each user

CREATE TABLE IF NOT EXISTS public.github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  github_user_id BIGINT NOT NULL,
  access_token TEXT NOT NULL,  -- Encrypted with ENCRYPTION_KEY
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Each user can only have one GitHub connection
  CONSTRAINT github_connections_user_unique UNIQUE (user_id)
);

-- Indexes
CREATE INDEX idx_github_connections_user_id ON public.github_connections(user_id);
CREATE INDEX idx_github_connections_github_user_id ON public.github_connections(github_user_id);

-- Updated at trigger
CREATE TRIGGER set_github_connections_updated_at
  BEFORE UPDATE ON public.github_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own GitHub connection
CREATE POLICY "Users can view own github connection"
  ON public.github_connections
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- Users can insert their own GitHub connection
CREATE POLICY "Users can insert own github connection"
  ON public.github_connections
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can update their own GitHub connection
CREATE POLICY "Users can update own github connection"
  ON public.github_connections
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

-- Users can delete their own GitHub connection
CREATE POLICY "Users can delete own github connection"
  ON public.github_connections
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ============================================
-- Project Repositories Table
-- ============================================
-- Links GitHub repos to Mockup AI projects

CREATE TABLE IF NOT EXISTS public.project_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_full_name TEXT GENERATED ALWAYS AS (repo_owner || '/' || repo_name) STORED,
  default_branch TEXT DEFAULT 'main',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Each project can only have one linked repository
  CONSTRAINT project_repositories_project_unique UNIQUE (project_id)
);

-- Indexes
CREATE INDEX idx_project_repositories_project_id ON public.project_repositories(project_id);
CREATE INDEX idx_project_repositories_repo_full_name ON public.project_repositories(repo_full_name);

-- Updated at trigger
CREATE TRIGGER set_project_repositories_updated_at
  BEFORE UPDATE ON public.project_repositories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.project_repositories ENABLE ROW LEVEL SECURITY;

-- Users can view repositories for their projects
CREATE POLICY "Users can view own project repositories"
  ON public.project_repositories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_repositories.project_id
      AND projects.user_id = (SELECT auth.uid())
    )
  );

-- Users can link repositories to their projects
CREATE POLICY "Users can insert own project repositories"
  ON public.project_repositories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_repositories.project_id
      AND projects.user_id = (SELECT auth.uid())
    )
  );

-- Users can update repositories for their projects
CREATE POLICY "Users can update own project repositories"
  ON public.project_repositories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_repositories.project_id
      AND projects.user_id = (SELECT auth.uid())
    )
  );

-- Users can unlink repositories from their projects
CREATE POLICY "Users can delete own project repositories"
  ON public.project_repositories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_repositories.project_id
      AND projects.user_id = (SELECT auth.uid())
    )
  );


-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE public.github_connections IS 'Stores encrypted GitHub OAuth tokens for users';
COMMENT ON COLUMN public.github_connections.access_token IS 'Encrypted GitHub access token (AES-256)';
COMMENT ON COLUMN public.github_connections.scopes IS 'OAuth scopes granted by the user';

COMMENT ON TABLE public.project_repositories IS 'Links GitHub repositories to Mockup AI projects';
COMMENT ON COLUMN public.project_repositories.repo_full_name IS 'Generated column: owner/repo format';
COMMENT ON COLUMN public.project_repositories.last_synced_at IS 'Last time the repo was cloned/synced in sandbox';
