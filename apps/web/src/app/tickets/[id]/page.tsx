import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { CopyButton } from './copy-button'

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ticket } = await supabase
    .from('tickets')
    .select('*, projects(name)')
    .eq('id', id)
    .single()

  if (!ticket) {
    notFound()
  }

  return (
    <div className="p-8">
      <Link
        href="/tickets"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tickets
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{ticket.title}</h1>
          <div className="mt-2 flex items-center gap-4 text-muted-foreground">
            <span>{(ticket.projects as { name: string } | null)?.name ?? 'No project'}</span>
            {ticket.page_url && (
              <a
                href={ticket.page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                {new URL(ticket.page_url).hostname}
              </a>
            )}
          </div>
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

      {ticket.description && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{ticket.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Screenshots */}
      {(ticket.before_screenshot || ticket.after_screenshot) && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {ticket.before_screenshot && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Before</CardTitle>
              </CardHeader>
              <CardContent>
                <Image
                  src={ticket.before_screenshot}
                  alt="Before mockup"
                  width={800}
                  height={600}
                  className="w-full rounded-lg border border-border"
                  unoptimized
                />
              </CardContent>
            </Card>
          )}
          {ticket.after_screenshot && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">After (Mockup)</CardTitle>
              </CardHeader>
              <CardContent>
                <Image
                  src={ticket.after_screenshot}
                  alt="After mockup"
                  width={800}
                  height={600}
                  className="w-full rounded-lg border border-border"
                  unoptimized
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Claude Code Prompt */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Claude Code Prompt</CardTitle>
          <CopyButton text={ticket.prompt} />
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
            {ticket.prompt}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
