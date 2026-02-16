import { WebSocketServer, WebSocket } from 'ws'
import { config } from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import { WorkspaceManager } from './workspace-manager.js'
import { ClaudeSession } from './claude-session.js'

config()

const PORT = parseInt(process.env.PORT || '3001', 10)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

interface Session {
  id: string
  ws: WebSocket
  workspace: WorkspaceManager
  claude: ClaudeSession
}

const sessions = new Map<string, Session>()

const wss = new WebSocketServer({ port: PORT })

console.log(`Mockup AI Sandbox server running on ws://localhost:${PORT}`)
console.log(`Authentication: ${ANTHROPIC_API_KEY ? 'API Key configured' : 'Using CLI auth (run "claude login" first)'}`)

wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket connection')

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString())
      await handleMessage(ws, message)
    } catch (error) {
      console.error('Error handling message:', error)
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process message'
      }))
    }
  })

  ws.on('close', () => {
    // Clean up sessions for this connection
    for (const [sessionId, session] of sessions) {
      if (session.ws === ws) {
        session.workspace.cleanup()
        sessions.delete(sessionId)
        console.log(`Session ${sessionId} cleaned up`)
      }
    }
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

interface StartSessionMessage {
  type: 'start_session'
  data: {
    html: string
    css: string
    url: string
    title: string
    // GitHub repo context (Phase 2)
    repo?: {
      owner: string
      name: string
      branch: string
      token: string
    }
  }
}

interface ChatMessage {
  type: 'message'
  sessionId?: string
  content: string
}

interface ApproveMessage {
  type: 'approve'
  sessionId: string
}

type IncomingMessage = StartSessionMessage | ChatMessage | ApproveMessage

async function handleMessage(ws: WebSocket, message: IncomingMessage) {
  switch (message.type) {
    case 'start_session': {
      const sessionId = uuidv4()
      const workspace = new WorkspaceManager(sessionId)

      // Create workspace with captured page and optional repo context
      await workspace.create(message.data.html, message.data.css, message.data.repo)

      // Initialize Claude session with API key and page context
      const claude = new ClaudeSession(
        workspace,
        async (event) => {
          ws.send(JSON.stringify(event))

          // When Claude is done, send the updated HTML/CSS for preview
          if (event.type === 'done') {
            try {
              const html = await workspace.readFile('index.html')
              const css = await workspace.readFile('styles.css')
              ws.send(JSON.stringify({
                type: 'preview_update',
                html,
                css
              }))
            } catch (error) {
              console.error('Failed to read updated files:', error)
            }
          }
        },
        {
          apiKey: ANTHROPIC_API_KEY,
          pageTitle: message.data.title,
          pageUrl: message.data.url
        }
      )

      sessions.set(sessionId, { id: sessionId, ws, workspace, claude })

      ws.send(JSON.stringify({
        type: 'session_started',
        sessionId,
        pageInfo: {
          url: message.data.url,
          title: message.data.title
        }
      }))

      console.log(`Session ${sessionId} started for ${message.data.url}`)
      break
    }

    case 'message': {
      // Find session for this websocket
      let session: Session | undefined
      for (const s of sessions.values()) {
        if (s.ws === ws) {
          session = s
          break
        }
      }

      if (!session) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'No active session. Please start a session first.'
        }))
        return
      }

      // Send message to Claude
      await session.claude.sendMessage(message.content)
      break
    }

    case 'approve': {
      const session = sessions.get(message.sessionId)
      if (!session) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Session not found'
        }))
        return
      }

      // Generate ticket with prompt
      const ticket = await session.claude.generateTicket()

      ws.send(JSON.stringify({
        type: 'ticket_created',
        ticket
      }))

      break
    }
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...')
  for (const session of sessions.values()) {
    session.workspace.cleanup()
  }
  wss.close()
  process.exit(0)
})
