import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Ticket, FolderOpen, Sparkles } from 'lucide-react'
import { GitHubConnection } from '@/components/github-connection'

interface TicketWithProject {
  id: string
  title: string
  status: string
  projects: { name: string } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user stats
  const [projectsResult, ticketsResult, sessionsResult] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }),
    supabase.from('tickets').select('id', { count: 'exact', head: true }),
    supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  // Get recent tickets
  const { data: recentTickets } = await supabase
    .from('tickets')
    .select('*, projects(name)')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.email}</p>
        </div>
        <Link href="/projects">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* GitHub Integration */}
      <div className="mb-8">
        <GitHubConnection />
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsResult.count ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketsResult.count ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionsResult.count ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
          <CardDescription>Your latest mockup requests</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTickets && recentTickets.length > 0 ? (
            <div className="space-y-4">
              {(recentTickets as TicketWithProject[]).map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="font-medium">{ticket.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.projects?.name ?? 'No project'}
                    </p>
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
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Ticket className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No tickets yet</p>
              <p className="text-sm text-muted-foreground">
                Use the browser extension to create your first mockup
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
