# CLAUDE.md - Mockup AI

## Project Overview

**Vision:** BugHerd meets AI mockups meets Claude Code

Mockup AI is a browser extension + web platform that lets users capture webpage elements and send them to an AI-powered sandbox for intelligent mockup generation and code assistance.

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Extension     │────▶│   Web Backend   │────▶│    Sandbox      │
│   (Plasmo)      │     │   (Next.js)     │     │  (Claude SDK)   │
│                 │◀────│   + Supabase    │◀────│                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     Capture              Auth + Storage         AI Execution
```

### Monorepo Structure

```
apps/
├── web/           # Next.js 15 dashboard + API (@mockup-ai/web)
├── extension/     # Plasmo browser extension (@mockup-ai/extension)
└── sandbox/       # Claude Code SDK executor (@mockup-ai/sandbox)

packages/
├── shared/        # Types, utils, constants (@mockup-ai/shared)
└── ui/            # Shared React components (@mockup-ai/ui)
```

---

## Global Standards

Reference these files for universal preferences:

- **Tech Stack:** @~/.agent-os/standards/tech-stack.md
- **Code Style:** @~/.agent-os/standards/code-style.md
- **Best Practices:** @~/.agent-os/standards/best-practices.md

---

## Build Verification (MANDATORY)

**BEFORE COMPLETING ANY TASK**, run build verification:

```bash
# Full verification (ALWAYS RUN THIS)
npm run typecheck && npm run lint && npm run build
```

### App-Specific Builds

```bash
npm run build:web        # Build web dashboard
npm run build:extension  # Build browser extension
npm run build:sandbox    # Build sandbox server
```

### Policy

1. **STOP** if any command fails
2. **FIX** all errors completely
3. **RE-RUN** verification until everything passes
4. **ONLY THEN** consider the task complete

---

## CSS/Theme Requirements (CRITICAL)

### Forbidden Patterns

**NEVER use hardcoded colors:**

```tsx
// BAD - Will break in dark mode
bg-white bg-gray-50 bg-gray-100 bg-gray-200
text-gray-900 text-gray-700 text-gray-500 text-gray-400
border-gray-200 border-gray-300
```

### Required Patterns

**ALWAYS use theme-aware classes:**

| Use Case | Class |
|----------|-------|
| Page background | `bg-background` |
| Card/elevated surfaces | `bg-card` |
| Muted backgrounds | `bg-muted` |
| Primary text | `text-foreground` |
| Secondary text | `text-muted-foreground` |
| All borders | `border-border` |
| Primary brand | `bg-primary`, `text-primary` |
| Secondary elements | `bg-secondary`, `text-secondary` |
| Error states | `bg-destructive`, `text-destructive` |
| Input backgrounds | `bg-input` |
| Ring/focus | `ring-ring` |

### Dark Mode Status Colors

```tsx
// For status colors needing dark variants
<span className="text-green-500 dark:text-green-400">Success</span>
<span className="text-red-500 dark:text-red-400">Error</span>

// Semi-transparent backgrounds
<div className="bg-green-500/10 dark:bg-green-500/20">...</div>
```

---

## App-Specific Patterns

### apps/web (Next.js Dashboard)

**Server vs Client Components:**
- Default to Server Components (no `'use client'`)
- Use Client Components only for interactivity, hooks, browser APIs
- Keep client components small and focused

**Supabase Auth:**
```typescript
// CORRECT: Server-side auth
const { data: { user } } = await supabase.auth.getUser()

// WRONG: Never use getSession()
const { data: { session } } = await supabase.auth.getSession()
```

**RLS Policy:**
- Every public table MUST have RLS enabled
- Create policies BEFORE inserting data
- Test both authenticated and unauthenticated access

### apps/extension (Plasmo)

**Content Scripts:**
```typescript
// Use ~ prefix for extension imports
import { captureVisibleTab } from '~lib/capture'
import { sendToBackground } from '@plasmohq/messaging'
```

**Permissions:**
- Request minimal permissions
- Justify each permission in manifest
- Never use `eval()` or inject untrusted scripts

### apps/sandbox (Claude SDK)

**Security Isolation:**
- Run in isolated Node.js process
- Set execution timeouts (max 30s)
- Never access host environment variables
- Sanitize all inputs from WebSocket messages

**WebSocket Handling:**
```typescript
// Always validate message types
interface SandboxMessage {
  type: 'execute' | 'cancel' | 'status'
  payload: unknown
}
```

---

## Monorepo Commands

### Development

```bash
npm run dev              # Run all apps
npm run dev:web          # Run web only
npm run dev:extension    # Run extension only
npm run dev:sandbox      # Run sandbox only
```

### Build & Verify

```bash
npm run build            # Build all apps
npm run typecheck        # TypeScript check all
npm run lint             # Lint all apps
npm run clean            # Clean all build outputs
```

### Targeted Operations

```bash
# Run specific task for specific app
npx turbo run build --filter=@mockup-ai/web
npx turbo run lint --filter=@mockup-ai/shared
```

---

## Import Patterns

### Cross-Package Imports

```typescript
// Import from shared packages
import type { Project, Session, Message } from '@mockup-ai/shared'
import { formatDate, validateInput } from '@mockup-ai/shared'
import { Button, Card, Input } from '@mockup-ai/ui'
```

### App-Internal Imports

```typescript
// Next.js app (apps/web)
import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/project-card'

// Extension (apps/extension)
import { captureElement } from '~lib/capture'
import { BackgroundMessage } from '~types/messages'

// Sandbox (apps/sandbox)
import { executeCode } from './executor'
import type { SandboxConfig } from './types'
```

---

## Zero Tech Debt Policy

### Pre-Completion Checklist

Before marking ANY task complete:

- [ ] All imports resolve to actual files
- [ ] TypeScript strict mode passes with no errors
- [ ] No `any` types (use `unknown` if truly unknown)
- [ ] All colors are theme-aware (no `bg-white`, `text-gray-*`)
- [ ] `npm run build` passes without errors
- [ ] No unused imports or variables
- [ ] No console errors in browser

### Code Quality Gates

- **No quick fixes:** Fix issues properly, not with workarounds
- **No silent failures:** Always handle errors explicitly
- **No magic numbers:** Use named constants
- **No duplication:** Extract repeated code to shared utilities
- **No any types:** Type everything properly

---

## Security Requirements

### Supabase (apps/web)

- **RLS is mandatory** on all tables
- Use `getUser()` not `getSession()` for auth
- Never use service role key in client code
- Wrap auth state in loading checks

```typescript
// CORRECT: Service role only in API routes
import { createClient } from '@supabase/supabase-js'
const supabaseAdmin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
```

### Extension (apps/extension)

- Minimal permissions in manifest
- No `eval()` or `new Function()`
- Sanitize all HTML before injection
- Validate message origins

### Sandbox (apps/sandbox)

- Isolated code execution environment
- Timeouts on all operations (30s max)
- No access to host filesystem beyond workspace
- No access to host environment variables
- Rate limiting on API calls

---

## Agent OS Workflows

### Planning New Features

```
/create-spec
```

Use for non-trivial features that need planning.

### Executing Tasks

```
/execute-tasks
```

Use when implementing from a spec.

### Analyzing Existing Code

```
/analyze-product
```

Use to understand codebase patterns.

---

## Quick Prompts

### Start New Feature
```
I want to add [feature]. Let's plan it with /create-spec.
```

### Add shadcn Component
```
I need to add the [component] component from shadcn/ui to apps/web.
```

### Database Migration
```
I need to create a new migration for [table/change].
```

### Pre-Completion Verification
```
Run build verification: npm run typecheck && npm run lint && npm run build
```

---

## WebSocket Communication Patterns

### Message Types

```typescript
// Extension → Backend
interface ExtensionMessage {
  type: 'capture' | 'connect' | 'disconnect'
  sessionId: string
  payload: CaptureData | null
}

// Backend → Sandbox
interface BackendToSandbox {
  type: 'execute' | 'cancel'
  taskId: string
  code: string
  context: ExecutionContext
}

// Sandbox → Backend
interface SandboxToBackend {
  type: 'result' | 'error' | 'progress'
  taskId: string
  data: ExecutionResult | Error | ProgressUpdate
}
```

---

## Environment Variables

### apps/web

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SANDBOX_WS_URL=ws://localhost:3001
```

### apps/sandbox

Required in `.env`:
```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

**NEVER commit .env files. Use .env.example for templates.**

---

## Database Schema

Tables in Supabase (see `supabase/migrations/`):

- `users` - User profiles (linked to auth.users)
- `projects` - User projects
- `sessions` - Collaboration sessions
- `messages` - Chat messages in sessions
- `tickets` - Feature requests / bugs

All tables have RLS enabled with user-scoped policies.

---

*Using Agent OS for structured AI-assisted development.*
