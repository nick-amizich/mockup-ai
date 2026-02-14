import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { page_url, page_title, before_html, before_css, project_id } = body

    if (!page_url) {
      return NextResponse.json(
        { error: 'page_url is required' },
        { status: 400 }
      )
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        page_url,
        page_title: page_title || null,
        before_html: before_html || null,
        before_css: before_css || null,
        project_id: project_id || null,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error in POST /api/sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error in GET /api/sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
