import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/github/status
 * Returns the current GitHub connection status for the user
 */
export async function GET() {
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
    .select('github_username, github_user_id, scopes, created_at, updated_at')
    .eq('user_id', user.id)
    .single()

  if (connectionError || !connection) {
    return NextResponse.json({
      connected: false
    })
  }

  return NextResponse.json({
    connected: true,
    github_username: connection.github_username,
    github_user_id: connection.github_user_id,
    scopes: connection.scopes,
    connected_at: connection.created_at,
    updated_at: connection.updated_at
  })
}
