import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/projects/[id]/repository
 * Gets the linked repository for a project
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params

  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Verify user owns the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 }
    )
  }

  // Get linked repository
  const { data: repository, error: repoError } = await supabase
    .from('project_repositories')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (repoError || !repository) {
    return NextResponse.json({
      linked: false
    })
  }

  return NextResponse.json({
    linked: true,
    repository: {
      id: repository.id,
      repo_owner: repository.repo_owner,
      repo_name: repository.repo_name,
      repo_full_name: repository.repo_full_name,
      default_branch: repository.default_branch,
      last_synced_at: repository.last_synced_at
    }
  })
}

/**
 * POST /api/projects/[id]/repository
 * Links a repository to a project
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params

  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Parse request body
  const body = await request.json()
  const { repo_owner, repo_name, default_branch = 'main' } = body

  if (!repo_owner || !repo_name) {
    return NextResponse.json(
      { error: 'repo_owner and repo_name are required' },
      { status: 400 }
    )
  }

  // Verify user owns the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 }
    )
  }

  // Verify user has GitHub connected
  const { data: connection, error: connectionError } = await supabase
    .from('github_connections')
    .select('access_token')
    .eq('user_id', user.id)
    .single()

  if (connectionError || !connection) {
    return NextResponse.json(
      { error: 'GitHub not connected' },
      { status: 400 }
    )
  }

  // Verify user has access to the repository
  try {
    const accessToken = decrypt(connection.access_token)
    const repoResponse = await fetch(
      `https://api.github.com/repos/${repo_owner}/${repo_name}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Mockup-AI'
        }
      }
    )

    if (!repoResponse.ok) {
      return NextResponse.json(
        { error: 'Repository not found or access denied' },
        { status: 404 }
      )
    }
  } catch (err) {
    console.error('Failed to verify repository access:', err)
    return NextResponse.json(
      { error: 'Failed to verify repository access' },
      { status: 500 }
    )
  }

  // Upsert repository link
  const { data: repository, error: upsertError } = await supabase
    .from('project_repositories')
    .upsert({
      project_id: projectId,
      repo_owner,
      repo_name,
      default_branch,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'project_id'
    })
    .select()
    .single()

  if (upsertError) {
    console.error('Failed to link repository:', upsertError)
    return NextResponse.json(
      { error: 'Failed to link repository' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    repository: {
      id: repository.id,
      repo_owner: repository.repo_owner,
      repo_name: repository.repo_name,
      repo_full_name: repository.repo_full_name,
      default_branch: repository.default_branch
    }
  })
}

/**
 * DELETE /api/projects/[id]/repository
 * Unlinks a repository from a project
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params

  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Verify user owns the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 }
    )
  }

  // Delete repository link
  const { error: deleteError } = await supabase
    .from('project_repositories')
    .delete()
    .eq('project_id', projectId)

  if (deleteError) {
    console.error('Failed to unlink repository:', deleteError)
    return NextResponse.json(
      { error: 'Failed to unlink repository' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Repository unlinked successfully'
  })
}
