'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Ticket, Loader2, ExternalLink } from 'lucide-react'

interface TicketWithProject {
  id: string
  title: string
  status: string
  description: string | null
  page_url: string | null
  created_at: string
  projects: { name: string } | null
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketWithProject[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchTickets() {
    const { data } = await supabase
      .from('tickets')
      .select('*, projects(name)')
      .order('created_at', { ascending: false })

    setTickets((data as TicketWithProject[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tickets</h1>
        <p className="text-muted-foreground">Your mockup requests with Claude Code prompts</p>
      </div>

      {tickets.length > 0 ? (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Ticket className="h-5 w-5" />
                        {ticket.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {ticket.projects?.name ?? 'No project'} • {ticket.page_url && (
                          <span className="inline-flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {new URL(ticket.page_url).hostname}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        ticket.status === 'done'
                          ? 'success'
                          : ticket.status === 'in_progress'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {ticket.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {ticket.description && (
                    <p className="mb-2 text-sm text-muted-foreground line-clamp-2">
                      {ticket.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ticket className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 font-medium">No tickets yet</p>
            <p className="text-sm text-muted-foreground">
              Use the browser extension to create mockups and generate tickets
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
