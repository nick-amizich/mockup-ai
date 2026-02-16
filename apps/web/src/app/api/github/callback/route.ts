import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/encryption'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET

interface GitHubTokenResponse {
  access_token: string
  token_type: string
  scope: string
  error?: string
  error_description?: string
}

interface GitHubUser {
  id: number
  login: string
}

/**
 * GET /api/github/callback
 * Handles GitHub OAuth callback
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Get base URL for redirects
  const baseUrl = getBaseUrl(request)

  // Handle OAuth errors
  if (error) {
    console.error('GitHub OAuth error:', error, searchParams.get('error_description'))
    return NextResponse.redirect(`${baseUrl}/dashboard?error=github_auth_failed`)
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/dashboard?error=invalid_callback`)
  }

  // Validate state parameter
  const storedState = request.cookies.get('github_oauth_state')?.value
  if (!storedState || storedState !== state) {
    console.error('GitHub OAuth state mismatch')
    return NextResponse.redirect(`${baseUrl}/dashboard?error=invalid_state`)
  }

  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.redirect(`${baseUrl}/login?error=unauthorized`)
  }

  // Check GitHub OAuth is configured
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.error('GitHub OAuth not configured')
    return NextResponse.redirect(`${baseUrl}/dashboard?error=config_error`)
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code
      })
    })

    const tokenData: GitHubTokenResponse = await tokenResponse.json()

    if (tokenData.error || !tokenData.access_token) {
      console.error('GitHub token exchange failed:', tokenData.error_description)
      return NextResponse.redirect(`${baseUrl}/dashboard?error=token_exchange_failed`)
    }

    // Get GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Mockup-AI'
      }
    })

    if (!userResponse.ok) {
      console.error('Failed to fetch GitHub user:', userResponse.status)
      return NextResponse.redirect(`${baseUrl}/dashboard?error=user_fetch_failed`)
    }

    const githubUser: GitHubUser = await userResponse.json()

    // Encrypt the access token
    const encryptedToken = encrypt(tokenData.access_token)

    // Store GitHub connection in database (upsert)
    const { error: dbError } = await supabase
      .from('github_connections')
      .upsert({
        user_id: user.id,
        github_username: githubUser.login,
        github_user_id: githubUser.id,
        access_token: encryptedToken,
        scopes: tokenData.scope.split(',').map(s => s.trim()),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (dbError) {
      console.error('Failed to store GitHub connection:', dbError)
      return NextResponse.redirect(`${baseUrl}/dashboard?error=db_error`)
    }

    // Clear the state cookie
    const response = NextResponse.redirect(`${baseUrl}/dashboard?github=connected`)
    response.cookies.delete('github_oauth_state')

    return response

  } catch (err) {
    console.error('GitHub OAuth callback error:', err)
    return NextResponse.redirect(`${baseUrl}/dashboard?error=unknown_error`)
  }
}

/**
 * Get base URL from request
 */
function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  return `${protocol}://${host}`
}
