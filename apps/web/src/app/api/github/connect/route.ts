import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize'

// Required scopes for repo access
const SCOPES = ['repo', 'read:user']

/**
 * GET /api/github/connect
 * Initiates GitHub OAuth flow
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

  // Check if GitHub OAuth is configured
  if (!GITHUB_CLIENT_ID) {
    return NextResponse.json(
      { error: 'GitHub OAuth is not configured' },
      { status: 500 }
    )
  }

  // Generate state parameter for CSRF protection
  const state = crypto.randomUUID()

  // Store state in session (using a cookie)
  const redirectUrl = new URL(GITHUB_OAUTH_URL)
  redirectUrl.searchParams.set('client_id', GITHUB_CLIENT_ID)
  redirectUrl.searchParams.set('scope', SCOPES.join(' '))
  redirectUrl.searchParams.set('state', state)
  redirectUrl.searchParams.set('redirect_uri', `${getBaseUrl(request)}/api/github/callback`)

  // Create response with redirect
  const response = NextResponse.redirect(redirectUrl.toString())

  // Store state in a secure cookie for validation
  response.cookies.set('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/'
  })

  return response
}

/**
 * Get base URL from request
 */
function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  return `${protocol}://${host}`
}
