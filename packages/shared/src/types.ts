// User types
export interface User {
  id: string
  email: string
  name: string | null
  plan: 'free' | 'pro' | 'team'
  sessions_used_this_month: number
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
}

// Project types
export interface Project {
  id: string
  user_id: string
  name: string
  url: string | null
  created_at: string
}

// Session types
export type SessionStatus = 'active' | 'completed' | 'discarded'

export interface Session {
  id: string
  project_id: string
  user_id: string
  page_url: string
  status: SessionStatus
  before_html: string | null
  after_html: string | null
  before_css: string | null
  after_css: string | null
  before_screenshot: string | null
  after_screenshot: string | null
  created_at: string
}

// Message types
export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  session_id: string
  role: MessageRole
  content: string
  screenshot: string | null
  tool_name: string | null
  created_at: string
}

// Ticket types
export type TicketStatus = 'open' | 'in_progress' | 'done'

export interface Ticket {
  id: string
  session_id: string | null
  project_id: string
  title: string
  prompt: string
  status: TicketStatus
  before_screenshot: string | null
  after_screenshot: string | null
  created_at: string
}

// WebSocket message types
export interface WSStartSession {
  type: 'start_session'
  data: {
    html: string
    css: string
    url: string
    title: string
  }
}

export interface WSChatMessage {
  type: 'message'
  content: string
}

export interface WSApprove {
  type: 'approve'
  sessionId: string
}

export type WSClientMessage = WSStartSession | WSChatMessage | WSApprove

export interface WSSessionStarted {
  type: 'session_started'
  sessionId: string
  pageInfo: {
    url: string
    title: string
  }
}

export interface WSMessage {
  type: 'message'
  content: string
}

export interface WSToolUse {
  type: 'tool_use'
  tool: string
}

export interface WSError {
  type: 'error'
  error: string
}

export interface WSTicketCreated {
  type: 'ticket_created'
  ticket: {
    title: string
    prompt: string
    changes: {
      html: string
      css: string
    }
  }
}

export type WSServerMessage =
  | WSSessionStarted
  | WSMessage
  | WSToolUse
  | WSError
  | WSTicketCreated
