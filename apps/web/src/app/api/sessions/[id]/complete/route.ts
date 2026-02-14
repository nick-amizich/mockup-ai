import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      after_html,
      after_css,
      ticket_title,
      ticket_prompt,
      ticket_description,
      project_id,
      changes_summary
    } = body

    // First, update the session to completed status
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .update({
        status: 'completed',
        after_html: after_html || null,
        after_css: after_css || null
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (sessionError) {
      console.error('Error updating session:', sessionError)
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      )
    }

    // If ticket data provided, create a ticket
    let ticket = null
    if (ticket_title && ticket_prompt) {
      // Use project_id from request or session
      const ticketProjectId = project_id || session.project_id

      if (!ticketProjectId) {
        // If no project, create a default one for this user
        const { data: defaultProject, error: projectError } = await supabase
          .from('projects')
          .upsert({
            user_id: user.id,
            name: 'Default Project',
            url: session.page_url
          }, {
            onConflict: 'user_id,name'
          })
          .select()
          .single()

        if (projectError) {
          // Try to get existing default project
          const { data: existingProject } = await supabase
            .from('projects')
            .select()
            .eq('user_id', user.id)
            .eq('name', 'Default Project')
            .single()

          if (existingProject) {
            const { data: newTicket, error: ticketError } = await supabase
              .from('tickets')
              .insert({
                session_id: id,
                project_id: existingProject.id,
                user_id: user.id,
                title: ticket_title,
                description: ticket_description || null,
                prompt: ticket_prompt,
                page_url: session.page_url,
                changes_summary: changes_summary || null,
                status: 'open'
              })
              .select()
              .single()

            if (!ticketError) {
              ticket = newTicket
            }
          }
        } else if (defaultProject) {
          const { data: newTicket, error: ticketError } = await supabase
            .from('tickets')
            .insert({
              session_id: id,
              project_id: defaultProject.id,
              user_id: user.id,
              title: ticket_title,
              description: ticket_description || null,
              prompt: ticket_prompt,
              page_url: session.page_url,
              changes_summary: changes_summary || null,
              status: 'open'
            })
            .select()
            .single()

          if (!ticketError) {
            ticket = newTicket
          }
        }
      } else {
        const { data: newTicket, error: ticketError } = await supabase
          .from('tickets')
          .insert({
            session_id: id,
            project_id: ticketProjectId,
            user_id: user.id,
            title: ticket_title,
            description: ticket_description || null,
            prompt: ticket_prompt,
            page_url: session.page_url,
            changes_summary: changes_summary || null,
            status: 'open'
          })
          .select()
          .single()

        if (ticketError) {
          console.error('Error creating ticket:', ticketError)
        } else {
          ticket = newTicket
        }
      }
    }

    return NextResponse.json({
      session,
      ticket
    })
  } catch (error) {
    console.error('Error in POST /api/sessions/[id]/complete:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
