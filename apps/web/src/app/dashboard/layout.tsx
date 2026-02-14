import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sparkles, LayoutDashboard, FolderOpen, Ticket, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-card md:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b border-border px-6">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Mockup AI</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/projects"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <FolderOpen className="h-4 w-4" />
              Projects
            </Link>
            <Link
              href="/tickets"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Ticket className="h-4 w-4" />
              Tickets
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>

          {/* User section */}
          <div className="border-t border-border p-4">
            <div className="mb-3 text-sm">
              <p className="font-medium truncate">{user.email}</p>
              <p className="text-muted-foreground">Free Plan</p>
            </div>
            <form action={signOut}>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
