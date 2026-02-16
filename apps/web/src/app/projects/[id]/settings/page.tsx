import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Settings } from 'lucide-react'
import { RepoSelector } from './repo-selector'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectSettingsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Get project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    notFound()
  }

  // Get linked repository
  const { data: repository } = await supabase
    .from('project_repositories')
    .select('*')
    .eq('project_id', id)
    .single()

  // Check GitHub connection
  const { data: githubConnection } = await supabase
    .from('github_connections')
    .select('github_username')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/projects" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Link>
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">Project Settings</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                <dd className="text-lg">{project.name}</dd>
              </div>
              {project.url && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">URL</dt>
                  <dd className="text-lg">
                    <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      {project.url}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                <dd className="text-lg">{new Date(project.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Repository Linking */}
        <Card>
          <CardHeader>
            <CardTitle>GitHub Repository</CardTitle>
            <CardDescription>
              Link a GitHub repository to give Claude access to your source code when creating mockups.
              This helps Claude understand your component patterns and coding conventions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {githubConnection ? (
              <RepoSelector
                projectId={id}
                currentRepo={repository ? {
                  owner: repository.repo_owner,
                  name: repository.repo_name,
                  fullName: repository.repo_full_name,
                  branch: repository.default_branch
                } : null}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <p className="mb-4 text-muted-foreground">
                  Connect your GitHub account to link repositories to this project.
                </p>
                <Link href="/dashboard">
                  <Button>Go to Dashboard to Connect GitHub</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
