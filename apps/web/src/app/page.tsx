import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles, Code, ArrowRight, Chrome } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Mockup AI</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm">
            <Chrome className="h-4 w-4" />
            <span>Chrome Extension Available</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl">
            AI-Powered Website Mockups in{' '}
            <span className="text-primary">Seconds</span>
          </h1>

          <p className="mb-8 text-xl text-muted-foreground">
            Describe changes in plain English. See visual mockups instantly.
            Generate developer-ready Claude Code prompts.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/login">
              <Button size="lg" className="gap-2">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="gap-2">
              <Chrome className="h-4 w-4" />
              Install Extension
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mt-24 grid max-w-5xl gap-8 px-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Describe in English</h3>
            <p className="text-muted-foreground">
              Just say what you want changed. &quot;Make the header sticky&quot;
              or &quot;Add a search bar.&quot;
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">See It Instantly</h3>
            <p className="text-muted-foreground">
              AI generates visual mockups in real-time. Watch your ideas come to
              life.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
              <Code className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Copy → Claude Code</h3>
            <p className="text-muted-foreground">
              Get a ready-to-use prompt. Paste it into Claude Code and watch it
              implement.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Mockup AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
