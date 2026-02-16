import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'
import type { GitHubRepo } from '@mockup-ai/shared'

interface GitHubRepoResponse {
  id: number
  name: string
  full_name: string
  owner: {
    login: string
    avatar_url: string
  }
  default_branch: string
  private: boolean
  html_url: string
  description: string | null
}

/**
 * GET /api/github/repos
 * Lists GitHub repositories for the authenticated user
 */
export async function GET(request: NextRequest) {
  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Get GitHub connection
  const { data: connection, error: connectionError } = await supabase
    .from('github_connections')
    .select('access_token, github_username')
    .eq('user_id', user.id)
    .single()

  if (connectionError || !connection) {
    return NextResponse.json(
      { error: 'GitHub not connected', connected: false },
      { status: 404 }
    )
  }

  try {
    // Decrypt the access token
    const accessToken = decrypt(connection.access_token)

    // Get pagination params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '30')

    // Fetch repositories from GitHub
    const response = await fetch(
      `https://api.github.com/user/repos?sort=updated&direction=desc&page=${page}&per_page=${perPage}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Mockup-AI'
        }
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or revoked
        return NextResponse.json(
          { error: 'GitHub token expired', connected: false },
          { status: 401 }
        )
      }
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const repos: GitHubRepoResponse[] = await response.json()

    // Transform to our type
    const transformedRepos: GitHubRepo[] = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: {
        login: repo.owner.login,
        avatar_url: repo.owner.avatar_url
      },
      default_branch: repo.default_branch,
      private: repo.private,
      html_url: repo.html_url,
      description: repo.description
    }))

    // Check for pagination
    const linkHeader = response.headers.get('Link')
    const hasMore = linkHeader?.includes('rel="next"') || false

    return NextResponse.json({
      repos: transformedRepos,
      github_username: connection.github_username,
      page,
      per_page: perPage,
      has_more: hasMore
    })

  } catch (err) {
    console.error('Failed to fetch GitHub repos:', err)
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    )
  }
}
