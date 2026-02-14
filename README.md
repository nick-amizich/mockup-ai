# Mockup AI

**"BugHerd meets AI mockups meets Claude Code"**

A browser extension + web app that lets anyone:
1. Visit any website
2. Describe changes in plain English
3. See AI-powered visual mockups instantly
4. Generate developer-ready Claude Code prompts

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSER EXTENSION                           │
│  • Captures page HTML/CSS/screenshot                            │
│  • Injects chat sidebar                                         │
│  • Communicates with cloud backend                              │
└─────────────────────┬───────────────────────────────────────────┘
                      │ WebSocket
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CLOUD BACKEND (Next.js)                     │
│  • Auth (magic link / Google)                                   │
│  • Project management                                           │
│  • Session persistence                                          │
│  • Ticket/prompt storage                                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SANDBOX SERVICE                             │
│  • Receives HTML snapshot from extension                        │
│  • Runs Claude with editing tools                               │
│  • Returns preview + diff                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
mockup-ai/
├── apps/
│   ├── web/           # Next.js dashboard
│   ├── extension/     # Browser extension (Plasmo)
│   └── sandbox/       # AI sandbox service
├── packages/
│   ├── shared/        # Shared types, utils
│   └── ui/            # Shared UI components
└── supabase/          # Database migrations
```

## Getting Started

```bash
# Install dependencies
npm install

# Start all apps in development
npm run dev

# Or start individual apps
npm run dev:web
npm run dev:extension
npm run dev:sandbox
```

## Environment Variables

Copy `.env.example` to `.env.local` in each app directory and fill in the values.

### Web App (`apps/web/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SANDBOX_WS_URL=ws://localhost:3001
```

### Sandbox (`apps/sandbox/.env.local`)
```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## License

MIT
