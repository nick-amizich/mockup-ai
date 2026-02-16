import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/github/disconnect
 * Disconnects GitHub from the user's account
 */
export async function DELETE() {
  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Delete GitHub connection
  const { error: deleteError } = await supabase
    .from('github_connections')
    .delete()
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('Failed to delete GitHub connection:', deleteError)
    return NextResponse.json(
      { error: 'Failed to disconnect GitHub' },
      { status: 500 }
    )
  }

  // Note: Project repositories will be deleted automatically via CASCADE
  // when the github_connections row is deleted, or remain orphaned but harmless
  // since they require a valid GitHub connection to be useful

  return NextResponse.json({
    success: true,
    message: 'GitHub disconnected successfully'
  })
}
